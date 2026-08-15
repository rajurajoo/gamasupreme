const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

function withTotals(inv) {
  const total = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const vatRate = inv.vatRate != null ? inv.vatRate : 5;
  const vatAmount = Math.round(total * (vatRate / 100) * 100) / 100;
  const totalWithVat = Math.round((total + vatAmount) * 100) / 100;
  const balance = totalWithVat - inv.amountPaid;
  return { ...inv, total, vatRate, vatAmount, totalWithVat, balance };
}

const include = {
  items: { include: { product: true } },
  quotation: { include: { customer: true } },
  project: true,
  business: true,
};

router.get('/', requireBusiness, async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { businessId: req.businessId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(invoices.map(withTotals));
});

router.get('/:id', async (req, res) => {
  const inv = await prisma.invoice.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  res.json(withTotals(inv));
});

// Create an invoice FROM an accepted quotation - copies customer & line items.
// For Material Trading, decrements stock for any line item linked to a product.
router.post('/from-quotation/:quotationId', requireRole('admin', 'sales_staff'), async (req, res) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: Number(req.params.quotationId) },
    include: { items: { include: { product: true } }, business: true },
  });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  if (quotation.status !== 'accepted') {
    return res.status(400).json({ error: 'Quotation must be accepted before invoicing' });
  }
  const { dueDate } = req.body;
  if (!dueDate) return res.status(400).json({ error: 'dueDate required' });

  // Validate stock availability up-front for Material Trading items.
  for (const i of quotation.items) {
    if (i.productId && i.product && i.product.stockQty < i.qty) {
      return res.status(400).json({ error: `Insufficient stock for ${i.product.name} (have ${i.product.stockQty}, need ${i.qty})` });
    }
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `INV-${quotation.business.code}`);
    const created = await tx.invoice.create({
      data: {
        number,
        businessId: quotation.businessId,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        projectId: quotation.projectId,
        dueDate: new Date(dueDate),
        items: {
          create: quotation.items.map((i) => ({
            description: i.description,
            qty: i.qty,
            unitPrice: i.unitPrice,
            doorWidth: i.doorWidth,
            doorHeight: i.doorHeight,
            material: i.material,
            finish: i.finish,
            productId: i.productId,
          })),
        },
      },
      include,
    });

    // Decrement stock for any Material Trading line items tied to a product.
    for (const i of quotation.items) {
      if (i.productId) {
        await tx.product.update({
          where: { id: i.productId },
          data: { stockQty: { decrement: i.qty } },
        });
      }
    }

    return created;
  });
  res.status(201).json(withTotals(invoice));
});

// Record a payment / change status.
router.put('/:id', requireRole('admin', 'sales_staff', 'accountant'), async (req, res) => {
  const { status, amountPaid } = req.body;
  const inv = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: { status, amountPaid: amountPaid != null ? Number(amountPaid) : undefined },
    include,
  });
  res.json(withTotals(inv));
});

module.exports = router;

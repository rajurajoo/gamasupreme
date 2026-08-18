const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

function withTotals(inv) {
  const subtotal = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const discountPercent = inv.discountPercent != null ? inv.discountPercent : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;
  const vatRate = inv.vatRate != null ? inv.vatRate : 5;
  const vatAmount = Math.round(afterDiscount * (vatRate / 100) * 100) / 100;
  const totalWithVat = Math.round((afterDiscount + vatAmount) * 100) / 100;
  const balance = totalWithVat - inv.amountPaid;
  // total kept for backward compatibility (== subtotal)
  return { ...inv, subtotal, total: subtotal, discountPercent, discountAmount, afterDiscount, vatRate, vatAmount, totalWithVat, balance };
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

// Create an invoice FROM an accepted quotation - percentage-based milestone billing.
// Each invoice bills `percent`% of the quotation's after-discount subtotal.
// For Material Trading, stock is only decremented on the invoice that brings
// the cumulative billed percent to 100 (the completing invoice) - at which
// point each original quotation item's full qty is decremented.
router.post('/from-quotation/:quotationId', requireRole('admin', 'sales_staff'), async (req, res) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: Number(req.params.quotationId) },
    include: { items: { include: { product: true } }, business: true, invoices: true },
  });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  if (quotation.status !== 'accepted') {
    return res.status(400).json({ error: 'Quotation must be accepted before invoicing' });
  }
  const { dueDate } = req.body;
  if (!dueDate) return res.status(400).json({ error: 'dueDate required' });

  const percent = Number(req.body.percent);
  if (!req.body.percent || Number.isNaN(percent) || percent < 1 || percent > 100) {
    return res.status(400).json({ error: 'percent is required and must be between 1 and 100' });
  }

  const alreadyInvoicedPercent = quotation.invoices.reduce(
    (sum, inv) => sum + (inv.percentOfQuotation != null ? inv.percentOfQuotation : 100),
    0
  );
  if (alreadyInvoicedPercent >= 100) {
    return res.status(400).json({ error: 'This quotation is already fully invoiced' });
  }
  const remaining = 100 - alreadyInvoicedPercent;
  if (percent > remaining) {
    return res.status(400).json({ error: `Only ${remaining}% remaining on this quotation` });
  }
  const cumulativePercent = alreadyInvoicedPercent + percent;
  const isCompleting = cumulativePercent >= 100;

  // Reuse the same after-discount subtotal math used elsewhere for quotations.
  const subtotal = quotation.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const discountPercent = quotation.discountPercent != null ? quotation.discountPercent : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;
  const lineAmount = Math.round(afterDiscount * (percent / 100) * 100) / 100;

  // Validate stock availability up-front, only when this is the completing invoice.
  if (isCompleting) {
    for (const i of quotation.items) {
      if (i.productId && i.product && i.product.stockQty < i.qty) {
        return res.status(400).json({ error: `Insufficient stock for ${i.product.name} (have ${i.product.stockQty}, need ${i.qty})` });
      }
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
        discountPercent: 0,
        percentOfQuotation: percent,
        items: {
          create: [{
            description: `Progress billing — ${percent}% of ${quotation.number}`,
            qty: 1,
            unitPrice: lineAmount,
          }],
        },
      },
      include,
    });

    // Only decrement stock on the invoice that completes the quotation (cumulative 100%).
    if (isCompleting) {
      for (const i of quotation.items) {
        if (i.productId) {
          await tx.product.update({
            where: { id: i.productId },
            data: { stockQty: { decrement: i.qty } },
          });
        }
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

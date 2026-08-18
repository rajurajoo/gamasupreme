const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

function withTotals(q) {
  const subtotal = q.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const discountPercent = q.discountPercent != null ? q.discountPercent : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;
  const vatRate = q.vatRate != null ? q.vatRate : 5;
  const vatAmount = Math.round(afterDiscount * (vatRate / 100) * 100) / 100;
  const totalWithVat = Math.round((afterDiscount + vatAmount) * 100) / 100;
  // total kept for backward compatibility (== subtotal)
  return { ...q, subtotal, total: subtotal, discountPercent, discountAmount, afterDiscount, vatRate, vatAmount, totalWithVat };
}

const include = { items: { include: { product: true } }, customer: true, project: true, business: true };
const includeWithInvoices = {
  ...include,
  invoices: {
    select: { id: true, number: true, percentOfQuotation: true, status: true, createdAt: true, items: true, amountPaid: true, vatRate: true, discountPercent: true },
    orderBy: { createdAt: 'asc' },
  },
};

function withInvoiceProgress(q) {
  const alreadyInvoicedPercent = (q.invoices || []).reduce(
    (sum, inv) => sum + (inv.percentOfQuotation != null ? inv.percentOfQuotation : 100),
    0
  );
  const invoicedPercent = Math.min(100, alreadyInvoicedPercent);
  const remainingPercent = Math.max(0, 100 - alreadyInvoicedPercent);
  const invoices = (q.invoices || []).map((inv) => {
    const subtotal = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const discountPercent = inv.discountPercent != null ? inv.discountPercent : 0;
    const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
    const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;
    const vatRate = inv.vatRate != null ? inv.vatRate : 5;
    const vatAmount = Math.round(afterDiscount * (vatRate / 100) * 100) / 100;
    const totalWithVat = Math.round((afterDiscount + vatAmount) * 100) / 100;
    return { id: inv.id, number: inv.number, percentOfQuotation: inv.percentOfQuotation, status: inv.status, createdAt: inv.createdAt, totalWithVat };
  });
  return { ...q, invoices, invoicedPercent, remainingPercent };
}

router.get('/', requireBusiness, async (req, res) => {
  const quotations = await prisma.quotation.findMany({
    where: { businessId: req.businessId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(quotations.map(withTotals));
});

router.get('/:id', async (req, res) => {
  const q = await prisma.quotation.findUnique({
    where: { id: Number(req.params.id) },
    include: includeWithInvoices,
  });
  if (!q) return res.status(404).json({ error: 'Not found' });
  res.json(withInvoiceProgress(withTotals(q)));
});

router.post('/', requireBusiness, requireRole('admin', 'sales_staff'), async (req, res) => {
  const { customerId, jobType, notes, items, projectId, discountPercent } = req.body;
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerId and at least one item required' });
  }
  const business = await prisma.business.findUnique({ where: { id: req.businessId } });
  if (!business) return res.status(400).json({ error: 'Invalid business' });

  const quotation = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `QT-${business.code}`);
    return tx.quotation.create({
      data: {
        number,
        businessId: business.id,
        customerId: Number(customerId),
        projectId: projectId ? Number(projectId) : null,
        jobType: jobType || 'standard',
        notes,
        jobStage: business.code === 'DM' ? 'Measurement' : null,
        discountPercent: discountPercent != null && discountPercent !== '' ? Number(discountPercent) : 0,
        items: {
          create: items.map((i) => ({
            description: i.description,
            qty: Number(i.qty),
            unitPrice: Number(i.unitPrice),
            doorWidth: i.doorWidth != null && i.doorWidth !== '' ? Number(i.doorWidth) : null,
            doorHeight: i.doorHeight != null && i.doorHeight !== '' ? Number(i.doorHeight) : null,
            material: i.material || null,
            finish: i.finish || null,
            productId: i.productId ? Number(i.productId) : null,
          })),
        },
      },
      include,
    });
  });
  res.status(201).json(withTotals(quotation));
});

router.put('/:id', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { status, notes, jobStage, discountPercent } = req.body;
  const q = await prisma.quotation.update({
    where: { id: Number(req.params.id) },
    data: {
      status,
      notes,
      jobStage,
      discountPercent: discountPercent != null && discountPercent !== '' ? Number(discountPercent) : undefined,
    },
    include,
  });
  res.json(withTotals(q));
});

module.exports = router;

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
  revisionOf: { select: { id: true, number: true, revisionNumber: true } },
  revisions: { select: { id: true, number: true, revisionNumber: true, status: true, createdAt: true }, orderBy: { revisionNumber: 'asc' } },
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
  const {
    customerId, customerName, customerEmail, customerPhone, jobType, notes, items, projectId, discountPercent,
    refBy, validUntil, attn, projectLocation, subject, exclusions, paymentTerms, durationOfWork, number: customNumber,
  } = req.body;
  if ((!customerId && !customerName) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName and at least one item required' });
  }
  const business = await prisma.business.findUnique({ where: { id: req.businessId } });
  if (!business) return res.status(400).json({ error: 'Invalid business' });

  if (customNumber && customNumber.trim()) {
    const existing = await prisma.quotation.findUnique({ where: { number: customNumber.trim() } });
    if (existing) return res.status(400).json({ error: 'A quotation with this number already exists' });
  }

  const quotation = await prisma.$transaction(async (tx) => {
    let resolvedCustomerId = customerId ? Number(customerId) : null;
    if (!resolvedCustomerId) {
      let customer = await tx.customer.findFirst({ where: { name: customerName } });
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: customerName, email: customerEmail || null, phone: customerPhone || null },
        });
      }
      resolvedCustomerId = customer.id;
    }
    const number = customNumber && customNumber.trim() ? customNumber.trim() : await nextDocNumber(tx, `QT-${business.code}`);
    return tx.quotation.create({
      data: {
        number,
        businessId: business.id,
        customerId: resolvedCustomerId,
        projectId: projectId ? Number(projectId) : null,
        jobType: jobType || 'standard',
        notes,
        jobStage: business.code === 'DM' ? 'Measurement' : null,
        discountPercent: discountPercent != null && discountPercent !== '' ? Number(discountPercent) : 0,
        refBy: refBy || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        attn: attn || null,
        projectLocation: projectLocation || null,
        subject: subject || null,
        exclusions: exclusions || null,
        paymentTerms: paymentTerms || null,
        durationOfWork: durationOfWork || null,
        items: {
          create: items.map((i) => ({
            description: i.description,
            qty: Number(i.qty),
            unit: i.unit || null,
            unitPrice: Number(i.unitPrice),
            doorWidth: i.doorWidth != null && i.doorWidth !== '' ? Number(i.doorWidth) : null,
            doorHeight: i.doorHeight != null && i.doorHeight !== '' ? Number(i.doorHeight) : null,
            material: i.material || null,
            finish: i.finish || null,
            workerCount: i.workerCount != null && i.workerCount !== '' ? Number(i.workerCount) : null,
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
  const {
    status, notes, jobStage, discountPercent, termsAndConditions, showWatermark,
    refBy, validUntil, attn, projectLocation, subject, exclusions, paymentTerms, durationOfWork, number,
  } = req.body;
  if (number !== undefined && number.trim()) {
    const existing = await prisma.quotation.findUnique({ where: { number: number.trim() } });
    if (existing && existing.id !== Number(req.params.id)) {
      return res.status(400).json({ error: 'A quotation with this number already exists' });
    }
  }
  const q = await prisma.quotation.update({
    where: { id: Number(req.params.id) },
    data: {
      status,
      notes,
      jobStage,
      number: number !== undefined && number.trim() ? number.trim() : undefined,
      discountPercent: discountPercent != null && discountPercent !== '' ? Number(discountPercent) : undefined,
      termsAndConditions,
      showWatermark: showWatermark !== undefined ? Boolean(showWatermark) : undefined,
      refBy: refBy !== undefined ? refBy : undefined,
      validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
      attn: attn !== undefined ? attn : undefined,
      projectLocation: projectLocation !== undefined ? projectLocation : undefined,
      subject: subject !== undefined ? subject : undefined,
      exclusions: exclusions !== undefined ? exclusions : undefined,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
      durationOfWork: durationOfWork !== undefined ? durationOfWork : undefined,
    },
    include,
  });
  res.json(withTotals(q));
});

// Create a new revised copy of this quotation. The ORIGINAL quotation (the
// root of the chain) keeps its plain number; each revision gets
// "<original number>-R<n>" where n increments per revision on that chain.
router.post('/:id/revise', requireRole('admin', 'sales_staff'), async (req, res) => {
  const source = await prisma.quotation.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: true },
  });
  if (!source) return res.status(404).json({ error: 'Quotation not found' });

  const rootId = source.revisionOfId || source.id;
  const root = source.revisionOfId
    ? await prisma.quotation.findUnique({ where: { id: rootId } })
    : source;
  if (!root) return res.status(404).json({ error: 'Original quotation not found' });

  const existingRevisions = await prisma.quotation.count({ where: { revisionOfId: rootId } });
  const nextRevisionNumber = existingRevisions + 1;
  const newNumber = `${root.number}-R${nextRevisionNumber}`;

  const revised = await prisma.quotation.create({
    data: {
      number: newNumber,
      businessId: source.businessId,
      customerId: source.customerId,
      projectId: source.projectId,
      jobType: source.jobType,
      notes: source.notes,
      jobStage: source.jobStage,
      discountPercent: source.discountPercent,
      vatRate: source.vatRate,
      refBy: source.refBy,
      validUntil: source.validUntil,
      attn: source.attn,
      projectLocation: source.projectLocation,
      subject: source.subject,
      exclusions: source.exclusions,
      paymentTerms: source.paymentTerms,
      durationOfWork: source.durationOfWork,
      termsAndConditions: source.termsAndConditions,
      revisionOfId: rootId,
      revisionNumber: nextRevisionNumber,
      status: 'draft',
      items: {
        create: source.items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          doorWidth: i.doorWidth,
          doorHeight: i.doorHeight,
          material: i.material,
          finish: i.finish,
          workerCount: i.workerCount,
          productId: i.productId,
        })),
      },
    },
    include,
  });
  res.status(201).json(withTotals(revised));
});

module.exports = router;

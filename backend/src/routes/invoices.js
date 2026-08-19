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

  const deductionLines = (inv.deductions || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, pctStr] = l.split('|').map((s) => (s || '').trim());
      const percent = Number(pctStr) || 0;
      const amount = Math.round(subtotal * (percent / 100) * 100) / 100;
      return { label, percent, amount };
    });
  const deductionsTotal = Math.round(deductionLines.reduce((sum, d) => sum + d.amount, 0) * 100) / 100;
  const afterDeductions = Math.round((afterDiscount - deductionsTotal) * 100) / 100;

  const vatRate = inv.vatRate != null ? inv.vatRate : 5;
  const vatAmount = Math.round(afterDeductions * (vatRate / 100) * 100) / 100;
  const totalWithVat = Math.round((afterDeductions + vatAmount) * 100) / 100;
  const balance = totalWithVat - inv.amountPaid;
  // total kept for backward compatibility (== subtotal)
  return {
    ...inv, subtotal, total: subtotal, discountPercent, discountAmount, afterDiscount,
    deductionLines, deductionsTotal, afterDeductions,
    vatRate, vatAmount, totalWithVat, balance,
  };
}

const include = {
  items: { include: { product: true } },
  quotation: { include: { customer: true } },
  customer: true,
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

// Create a standalone invoice manually (no source quotation required).
router.post('/', requireBusiness, requireRole('admin', 'sales_staff'), async (req, res) => {
  const {
    customerId, customerName, customerEmail, customerPhone,
    items, projectId, discountPercent, dueDate,
    subject, modeOfPayment, validUntil, deductions, site, number: customNumber,
  } = req.body;
  if ((!customerId && !customerName) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName and at least one item required' });
  }
  if (!dueDate) return res.status(400).json({ error: 'dueDate required' });
  const business = await prisma.business.findUnique({ where: { id: req.businessId } });
  if (!business) return res.status(400).json({ error: 'Invalid business' });

  if (customNumber && customNumber.trim()) {
    const existing = await prisma.invoice.findUnique({ where: { number: customNumber.trim() } });
    if (existing) return res.status(400).json({ error: 'An invoice with this number already exists' });
  }

  const invoice = await prisma.$transaction(async (tx) => {
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
    const number = customNumber && customNumber.trim() ? customNumber.trim() : await nextDocNumber(tx, `INV-${business.code}`);
    return tx.invoice.create({
      data: {
        number,
        businessId: business.id,
        customerId: resolvedCustomerId,
        projectId: projectId ? Number(projectId) : null,
        dueDate: new Date(dueDate),
        discountPercent: discountPercent != null && discountPercent !== '' ? Number(discountPercent) : 0,
        subject: subject || null,
        modeOfPayment: modeOfPayment || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        deductions: deductions || null,
        site: site || null,
        items: {
          create: items.map((i) => ({
            description: i.description,
            qty: Number(i.qty),
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
  res.status(201).json(withTotals(invoice));
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
        termsAndConditions: quotation.termsAndConditions || null,
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

// Record a payment / change status / update terms.
router.put('/:id', requireRole('admin', 'sales_staff', 'accountant'), async (req, res) => {
  const {
    status, amountPaid, termsAndConditions, showWatermark,
    subject, modeOfPayment, validUntil, deductions, site, number,
  } = req.body;
  if (number !== undefined && number.trim()) {
    const existing = await prisma.invoice.findUnique({ where: { number: number.trim() } });
    if (existing && existing.id !== Number(req.params.id)) {
      return res.status(400).json({ error: 'An invoice with this number already exists' });
    }
  }
  const inv = await prisma.invoice.update({
    where: { id: Number(req.params.id) },
    data: {
      status,
      amountPaid: amountPaid != null ? Number(amountPaid) : undefined,
      termsAndConditions,
      showWatermark: showWatermark !== undefined ? Boolean(showWatermark) : undefined,
      subject: subject !== undefined ? subject : undefined,
      modeOfPayment: modeOfPayment !== undefined ? modeOfPayment : undefined,
      validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
      deductions: deductions !== undefined ? deductions : undefined,
      site: site !== undefined ? site : undefined,
      number: number !== undefined && number.trim() ? number.trim() : undefined,
    },
    include,
  });
  res.json(withTotals(inv));
});

module.exports = router;

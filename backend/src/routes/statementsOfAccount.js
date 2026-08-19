const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

function invoiceTotals(inv) {
  const subtotal = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const discountPercent = inv.discountPercent != null ? inv.discountPercent : 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;

  const deductionLines = (inv.deductions || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [, pctStr] = l.split('|').map((s) => (s || '').trim());
      const percent = Number(pctStr) || 0;
      return Math.round(subtotal * (percent / 100) * 100) / 100;
    });
  const deductionsTotal = Math.round(deductionLines.reduce((sum, d) => sum + d, 0) * 100) / 100;
  const afterDeductions = Math.round((afterDiscount - deductionsTotal) * 100) / 100;

  const vatRate = inv.vatRate != null ? inv.vatRate : 5;
  const vatAmount = Math.round(afterDeductions * (vatRate / 100) * 100) / 100;
  const totalWithVat = Math.round((afterDeductions + vatAmount) * 100) / 100;
  const balance = Math.round((totalWithVat - inv.amountPaid) * 100) / 100;
  return { totalWithVat, balance };
}

// Build the live statement rows + totals for a project, regardless of whether
// a persisted StatementOfAccount record exists yet.
async function buildStatement(project) {
  const invoices = await prisma.invoice.findMany({
    where: { projectId: project.id },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });
  const rows = invoices.map((inv) => {
    const { totalWithVat, balance } = invoiceTotals(inv);
    return {
      invoiceId: inv.id,
      number: inv.number,
      date: inv.createdAt,
      invoiceAmount: totalWithVat,
      creditAmount: Math.round(inv.amountPaid * 100) / 100,
      balance,
      remark: inv.status === 'paid' ? 'Paid' : (inv.percentOfQuotation != null ? 'Advance' : ''),
    };
  });
  const totals = rows.reduce(
    (acc, r) => ({
      invoiceAmount: acc.invoiceAmount + r.invoiceAmount,
      creditAmount: acc.creditAmount + r.creditAmount,
      balance: acc.balance + r.balance,
    }),
    { invoiceAmount: 0, creditAmount: 0, balance: 0 }
  );
  return {
    rows,
    totals: {
      invoiceAmount: Math.round(totals.invoiceAmount * 100) / 100,
      creditAmount: Math.round(totals.creditAmount * 100) / 100,
      balance: Math.round(totals.balance * 100) / 100,
    },
  };
}

const include = { business: true, project: true, customer: true };

router.get('/', requireBusiness, async (req, res) => {
  const where = { businessId: req.businessId };
  if (req.query.projectId) where.projectId = Number(req.query.projectId);
  const soas = await prisma.statementOfAccount.findMany({
    where,
    include,
    orderBy: { createdAt: 'desc' },
  });
  const withTotals = await Promise.all(soas.map(async (soa) => {
    const { totals } = await buildStatement(soa.project);
    return { ...soa, totals };
  }));
  res.json(withTotals);
});

router.get('/:id', async (req, res) => {
  const soa = await prisma.statementOfAccount.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!soa) return res.status(404).json({ error: 'Not found' });
  const statement = await buildStatement(soa.project);
  res.json({ ...soa, ...statement });
});

// Generate (or return the latest existing) statement of account for a project.
router.post('/project/:projectId', requireRole('admin', 'sales_staff', 'accountant'), async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: Number(req.params.projectId) } });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.customerId) return res.status(400).json({ error: 'Project has no customer assigned' });

  const { modeOfPayment, validUntil } = req.body;

  const soa = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `SOA-${project.code || 'GEN'}`);
    return tx.statementOfAccount.create({
      data: {
        number,
        businessId: project.businessId,
        projectId: project.id,
        customerId: project.customerId,
        modeOfPayment: modeOfPayment || null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
      include,
    });
  });
  const statement = await buildStatement(project);
  res.status(201).json({ ...soa, ...statement });
});

router.put('/:id', requireRole('admin', 'sales_staff', 'accountant'), async (req, res) => {
  const { modeOfPayment, validUntil, showWatermark, number } = req.body;
  if (number !== undefined && number.trim()) {
    const existing = await prisma.statementOfAccount.findUnique({ where: { number: number.trim() } });
    if (existing && existing.id !== Number(req.params.id)) {
      return res.status(400).json({ error: 'A statement with this number already exists' });
    }
  }
  const soa = await prisma.statementOfAccount.update({
    where: { id: Number(req.params.id) },
    data: {
      modeOfPayment: modeOfPayment !== undefined ? modeOfPayment : undefined,
      validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
      showWatermark: showWatermark !== undefined ? Boolean(showWatermark) : undefined,
      number: number !== undefined && number.trim() ? number.trim() : undefined,
    },
    include,
  });
  const statement = await buildStatement(soa.project);
  res.json({ ...soa, ...statement });
});

module.exports = router;

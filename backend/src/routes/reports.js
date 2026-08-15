const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin', 'accountant'));

// Monthly Account Auditing Report: aggregates invoices issued that month
// (total sales), the paid portion (collected), unpaid/partial (outstanding),
// and that month's payroll cost, then nets it out. Payroll is company-wide
// (shared employees), so it is shown once at the combined level, with sales
// figures also broken down per business.
router.get('/monthly/:month', async (req, res) => {
  const month = req.params.month; // "YYYY-MM"
  const [year, mon] = month.split('-').map(Number);
  if (!year || !mon) return res.status(400).json({ error: 'month must be YYYY-MM' });

  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { items: true, business: true },
  });

  const businesses = await prisma.business.findMany({ orderBy: { id: 'asc' } });
  const byBusiness = {};
  for (const b of businesses) {
    byBusiness[b.id] = { businessId: b.id, businessName: b.name, businessCode: b.code, invoiceCount: 0, totalSales: 0, totalCollected: 0, outstanding: 0 };
  }

  let totalSales = 0;
  let totalCollected = 0;
  let outstanding = 0;
  for (const inv of invoices) {
    const total = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    totalSales += total;
    totalCollected += inv.amountPaid;
    outstanding += total - inv.amountPaid;

    const bucket = byBusiness[inv.businessId];
    if (bucket) {
      bucket.invoiceCount += 1;
      bucket.totalSales += total;
      bucket.totalCollected += inv.amountPaid;
      bucket.outstanding += total - inv.amountPaid;
    }
  }

  const payrollRun = await prisma.payrollRun.findUnique({
    where: { month },
    include: { items: true },
  });
  const totalPayrollCost = payrollRun ? payrollRun.items.reduce((sum, i) => sum + i.netPay, 0) : 0;

  const netSummary = totalCollected - totalPayrollCost;

  res.json({
    month,
    invoiceCount: invoices.length,
    totalSales,
    totalCollected,
    outstanding,
    totalPayrollCost,
    netSummary,
    byBusiness: Object.values(byBusiness),
  });
});

module.exports = router;

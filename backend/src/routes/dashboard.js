const express = require('express');
const prisma = require('../db');
const { requireAuth, requireBusiness } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function invoiceTotal(inv) {
  return inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
}

// Last 6 months invoiced totals (AED), combined across all businesses.
// Reuses the same "sum of item qty*unitPrice, grouped by month" logic as
// the monthly report in reports.js, extended to iterate 6 calendar months.
router.get('/trend', async (req, res) => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  const rangeStart = new Date(Date.UTC(months[0].year, months[0].month, 1));
  const rangeEnd = new Date(Date.UTC(months[5].year, months[5].month + 1, 1));

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
    include: { items: true },
  });

  const data = months.map(({ year, month }) => {
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));
    const label = start.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) + ' ' + year;
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const total = invoices
      .filter((inv) => inv.createdAt >= start && inv.createdAt < end)
      .reduce((sum, inv) => sum + invoiceTotal(inv), 0);
    return { month: monthKey, label, total: Math.round(total * 100) / 100 };
  });

  res.json(data);
});

// Total invoiced AED per business, all-time.
router.get('/by-business', async (req, res) => {
  const businesses = await prisma.business.findMany({ orderBy: { id: 'asc' } });
  const invoices = await prisma.invoice.findMany({ include: { items: true } });

  const data = businesses.map((b) => {
    const total = invoices
      .filter((inv) => inv.businessId === b.id)
      .reduce((sum, inv) => sum + invoiceTotal(inv), 0);
    return { businessId: b.id, businessName: b.name, businessCode: b.code, total: Math.round(total * 100) / 100 };
  });

  res.json(data);
});

// Invoice status counts (unpaid/partial/paid) for the active business.
router.get('/status-breakdown', requireBusiness, async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { businessId: req.businessId },
    select: { status: true },
  });

  const counts = { unpaid: 0, partial: 0, paid: 0 };
  for (const inv of invoices) {
    if (counts[inv.status] != null) counts[inv.status] += 1;
    else counts[inv.status] = (counts[inv.status] || 0) + 1;
  }

  res.json(Object.entries(counts).map(([status, count]) => ({ status, count })));
});

module.exports = router;

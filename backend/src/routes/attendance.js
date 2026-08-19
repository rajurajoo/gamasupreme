const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function monthRange(month) {
  // month = "YYYY-MM", defaults to current month
  const m = month || new Date().toISOString().slice(0, 7);
  const [y, mo] = m.split('-').map(Number);
  const start = new Date(Date.UTC(y, mo - 1, 1));
  const end = new Date(Date.UTC(y, mo, 1));
  return { month: m, start, end };
}

// Shared helper so payroll.js can reuse the same summary logic without
// duplicating the query. Returns counts of each attendance status for the
// given employee/month.
async function getAttendanceSummary(prismaClient, employeeId, month) {
  const { start, end } = monthRange(month);
  const records = await prismaClient.attendance.findMany({
    where: { employeeId: Number(employeeId), date: { gte: start, lt: end } },
  });
  const summary = { presentDays: 0, absentDays: 0, leaveDays: 0, halfDays: 0 };
  for (const r of records) {
    if (r.status === 'present') summary.presentDays += 1;
    else if (r.status === 'absent') summary.absentDays += 1;
    else if (r.status === 'leave') summary.leaveDays += 1;
    else if (r.status === 'half_day') summary.halfDays += 1;
  }
  return summary;
}

// All roles can view attendance.
router.get('/', async (req, res) => {
  const { start, end, month } = monthRange(req.query.month);
  const records = await prisma.attendance.findMany({
    where: { date: { gte: start, lt: end } },
    include: { employee: true },
    orderBy: { date: 'desc' },
  });
  res.json(records.map((r) => ({ ...r, month })));
});

router.get('/summary', async (req, res) => {
  const { employeeId, month } = req.query;
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
  const summary = await getAttendanceSummary(prisma, employeeId, month);
  res.json(summary);
});

// Only admin/accountant record/edit attendance.
router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  const { employeeId, date, status, timeIn, timeOut } = req.body;
  if (!employeeId || !date || !status) {
    return res.status(400).json({ error: 'employeeId, date, status required' });
  }
  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: Number(employeeId), date: new Date(date) } },
    update: { status, timeIn: timeIn || null, timeOut: timeOut || null },
    create: { employeeId: Number(employeeId), date: new Date(date), status, timeIn: timeIn || null, timeOut: timeOut || null },
    include: { employee: true },
  });
  res.status(201).json(record);
});

router.post('/bulk', requireRole('admin', 'accountant'), async (req, res) => {
  const { date, entries } = req.body;
  if (!date || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'date and entries[] required' });
  }
  const results = [];
  for (const entry of entries) {
    const { employeeId, status, timeIn, timeOut } = entry;
    if (!employeeId || !status) continue;
    const record = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: Number(employeeId), date: new Date(date) } },
      update: { status, timeIn: timeIn || null, timeOut: timeOut || null },
      create: { employeeId: Number(employeeId), date: new Date(date), status, timeIn: timeIn || null, timeOut: timeOut || null },
      include: { employee: true },
    });
    results.push(record);
  }
  res.status(201).json(results);
});

module.exports = router;
module.exports.getAttendanceSummary = getAttendanceSummary;

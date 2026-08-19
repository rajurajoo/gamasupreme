const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getAttendanceSummary } = require('./attendance');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin', 'accountant'));

// Active employees for the "Run Monthly Payroll" form, each with a
// suggestedDeduction computed from that month's attendance (absences/half
// days). This is only a suggestion - the actual run still takes whatever
// deductions the caller submits via POST /.
router.get('/run/:month', async (req, res) => {
  const { month } = req.params;
  const employees = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  const rows = await Promise.all(employees.map(async (e) => {
    const summary = await getAttendanceSummary(prisma, e.id, month);
    const dailyRate = e.monthlySalary / 30;
    const suggestedDeduction = (summary.absentDays * dailyRate) + (summary.halfDays * dailyRate * 0.5);
    return { ...e, attendanceSummary: summary, suggestedDeduction: Math.round(suggestedDeduction * 100) / 100 };
  }));
  res.json(rows);
});

router.get('/', async (req, res) => {
  const runs = await prisma.payrollRun.findMany({
    include: { items: { include: { employee: true } } },
    orderBy: { month: 'desc' },
  });
  res.json(runs);
});

router.get('/:id', async (req, res) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: { include: { employee: true } } },
  });
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

// Create a payroll run for a month: auto-lists active employees at their base
// salary. Caller may pass adjustments (per-employee deductions/bonuses).
router.post('/', async (req, res) => {
  const { month, adjustments } = req.body; // month = "YYYY-MM", adjustments = [{employeeId, deductions, bonuses}]
  if (!month) return res.status(400).json({ error: 'month required (YYYY-MM)' });

  const existing = await prisma.payrollRun.findUnique({ where: { month } });
  if (existing) return res.status(400).json({ error: `Payroll run for ${month} already exists` });

  const employees = await prisma.employee.findMany({ where: { active: true } });
  const adjMap = new Map((adjustments || []).map((a) => [Number(a.employeeId), a]));

  const run = await prisma.payrollRun.create({
    data: {
      month,
      items: {
        create: employees.map((e) => {
          const adj = adjMap.get(e.id) || {};
          const deductions = Number(adj.deductions || 0);
          const bonuses = Number(adj.bonuses || 0);
          const netPay = e.monthlySalary - deductions + bonuses;
          return { employeeId: e.id, baseSalary: e.monthlySalary, deductions, bonuses, netPay };
        }),
      },
    },
    include: { items: { include: { employee: true } } },
  });
  res.status(201).json(run);
});

module.exports = router;

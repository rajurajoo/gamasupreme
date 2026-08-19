const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Petty cash is shared across all businesses - no business scoping here.

// Compute running balance per employee: sum(advances) - sum(expenses).
async function getBalances() {
  const employees = await prisma.employee.findMany({ where: { active: true } });
  const transactions = await prisma.pettyCashTransaction.findMany();
  return employees.map((emp) => {
    const empTx = transactions.filter((t) => t.employeeId === emp.id);
    const totalAdvance = empTx.filter((t) => t.type === 'advance').reduce((s, t) => s + t.amount, 0);
    const totalExpense = empTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      totalAdvance,
      totalExpense,
      balance: Math.round((totalAdvance - totalExpense) * 100) / 100,
    };
  });
}

// Balances for every active employee.
router.get('/balances', async (req, res) => {
  const balances = await getBalances();
  res.json(balances);
});

// Full transaction history (optionally filtered to one employee).
router.get('/', async (req, res) => {
  const where = {};
  if (req.query.employeeId) where.employeeId = Number(req.query.employeeId);
  const transactions = await prisma.pettyCashTransaction.findMany({
    where,
    include: { employee: true },
    orderBy: { date: 'desc' },
  });
  res.json(transactions);
});

// Single transaction, for the voucher print view.
router.get('/:id', async (req, res) => {
  const tx = await prisma.pettyCashTransaction.findUnique({
    where: { id: Number(req.params.id) },
    include: { employee: true },
  });
  if (!tx) return res.status(404).json({ error: 'Not found' });
  res.json(tx);
});

// Give a cash advance to a person.
router.post('/advance', requireRole('admin', 'accountant'), async (req, res) => {
  const { employeeId, amount, description, date } = req.body;
  if (!employeeId || !amount) return res.status(400).json({ error: 'employeeId and amount required' });
  if (Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });
  const tx = await prisma.pettyCashTransaction.create({
    data: {
      employeeId: Number(employeeId),
      type: 'advance',
      amount: Number(amount),
      description: description || null,
      date: date ? new Date(date) : new Date(),
    },
    include: { employee: true },
  });
  res.status(201).json(tx);
});

// Record an expense against a person's petty cash balance. Rejected if it
// would take the balance negative.
router.post('/expense', requireRole('admin', 'accountant'), async (req, res) => {
  const { employeeId, amount, description, date } = req.body;
  if (!employeeId || !amount) return res.status(400).json({ error: 'employeeId and amount required' });
  if (Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });

  const balances = await getBalances();
  const current = balances.find((b) => b.employeeId === Number(employeeId));
  const currentBalance = current ? current.balance : 0;
  if (Number(amount) > currentBalance) {
    return res.status(400).json({ error: `Expense exceeds remaining balance (AED ${currentBalance.toFixed(2)} available)` });
  }

  const tx = await prisma.pettyCashTransaction.create({
    data: {
      employeeId: Number(employeeId),
      type: 'expense',
      amount: Number(amount),
      description: description || null,
      date: date ? new Date(date) : new Date(),
    },
    include: { employee: true },
  });
  res.status(201).json(tx);
});

module.exports = router;

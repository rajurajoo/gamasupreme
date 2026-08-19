const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const include = { business: true, lines: { include: { account: true } } };

function withTotals(entry) {
  const totalDebit = Math.round(entry.lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
  const totalCredit = Math.round(entry.lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;
  return { ...entry, totalDebit, totalCredit };
}

// Combined cross-business list by default; optionally filtered to one business.
router.get('/', async (req, res) => {
  const where = {};
  if (req.query.businessId) where.businessId = Number(req.query.businessId);
  const entries = await prisma.journalEntry.findMany({
    where,
    include,
    orderBy: { date: 'desc' },
  });
  res.json(entries.map(withTotals));
});

router.get('/:id', async (req, res) => {
  const entry = await prisma.journalEntry.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(withTotals(entry));
});

// Create a balanced journal entry: total debits must equal total credits.
router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  const { businessId, date, reference, description, lines } = req.body;
  if (!businessId) return res.status(400).json({ error: 'businessId required' });
  if (!Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: 'At least 2 journal lines required' });
  }
  for (const l of lines) {
    if (!l.accountId) return res.status(400).json({ error: 'Each line requires an accountId' });
    const debit = Number(l.debit) || 0;
    const credit = Number(l.credit) || 0;
    if (debit > 0 && credit > 0) return res.status(400).json({ error: 'A line cannot have both debit and credit' });
    if (debit === 0 && credit === 0) return res.status(400).json({ error: 'Each line needs a debit or credit amount' });
  }
  const totalDebit = Math.round(lines.reduce((s, l) => s + (Number(l.debit) || 0), 0) * 100) / 100;
  const totalCredit = Math.round(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0) * 100) / 100;
  if (totalDebit !== totalCredit) {
    return res.status(400).json({ error: `Entry is not balanced: total debit ${totalDebit} vs total credit ${totalCredit}` });
  }

  const entry = await prisma.journalEntry.create({
    data: {
      businessId: Number(businessId),
      date: date ? new Date(date) : new Date(),
      reference: reference || null,
      description: description || null,
      lines: {
        create: lines.map((l) => ({
          accountId: Number(l.accountId),
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      },
    },
    include,
  });
  res.status(201).json(withTotals(entry));
});

// Trial balance: sum of debits/credits per account, optionally filtered to one business.
router.get('/reports/trial-balance', async (req, res) => {
  const where = {};
  if (req.query.businessId) where.journalEntry = { businessId: Number(req.query.businessId) };
  const lines = await prisma.journalLine.findMany({ where, include: { account: true } });
  const byAccount = {};
  for (const l of lines) {
    const key = l.account.id;
    if (!byAccount[key]) byAccount[key] = { accountId: l.account.id, code: l.account.code, name: l.account.name, type: l.account.type, debit: 0, credit: 0 };
    byAccount[key].debit += l.debit;
    byAccount[key].credit += l.credit;
  }
  const rows = Object.values(byAccount)
    .map((r) => ({ ...r, debit: Math.round(r.debit * 100) / 100, credit: Math.round(r.credit * 100) / 100 }))
    .sort((a, b) => a.code.localeCompare(b.code));
  res.json(rows);
});

// Profit & Loss (Income Statement): every income account's net credit balance,
// minus every expense account's net debit balance (office rent, electricity,
// water, salaries, etc. all flow in here via journal entries posted to those
// accounts) = Net Profit/Loss. Optionally filtered to one business and/or a
// month (YYYY-MM).
router.get('/reports/profit-loss', async (req, res) => {
  const where = {};
  const journalEntryWhere = {};
  if (req.query.businessId) journalEntryWhere.businessId = Number(req.query.businessId);
  if (req.query.month) {
    const [y, m] = req.query.month.split('-').map(Number);
    journalEntryWhere.date = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }
  if (Object.keys(journalEntryWhere).length > 0) where.journalEntry = journalEntryWhere;

  const lines = await prisma.journalLine.findMany({ where, include: { account: true } });
  const byAccount = {};
  for (const l of lines) {
    if (l.account.type !== 'income' && l.account.type !== 'expense') continue;
    const key = l.account.id;
    if (!byAccount[key]) byAccount[key] = { accountId: l.account.id, code: l.account.code, name: l.account.name, type: l.account.type, amount: 0 };
    // Income accounts are credit-normal, expense accounts are debit-normal.
    byAccount[key].amount += l.account.type === 'income' ? (l.credit - l.debit) : (l.debit - l.credit);
  }
  const rows = Object.values(byAccount).map((r) => ({ ...r, amount: Math.round(r.amount * 100) / 100 }));
  const income = rows.filter((r) => r.type === 'income').sort((a, b) => a.code.localeCompare(b.code));
  const expenses = rows.filter((r) => r.type === 'expense').sort((a, b) => a.code.localeCompare(b.code));
  const totalIncome = Math.round(income.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  const totalExpenses = Math.round(expenses.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  const netProfit = Math.round((totalIncome - totalExpenses) * 100) / 100;

  res.json({ income, expenses, totalIncome, totalExpenses, netProfit });
});

module.exports = router;

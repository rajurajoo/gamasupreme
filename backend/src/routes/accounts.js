const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash', type: 'asset' },
  { code: '1010', name: 'Bank', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'VAT Payable', type: 'liability' },
  { code: '3000', name: "Owner's Equity", type: 'equity' },
  { code: '4000', name: 'Sales Revenue', type: 'income' },
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
  { code: '5100', name: 'Salaries Expense', type: 'expense' },
  { code: '5200', name: 'Office Rent Expense', type: 'expense' },
  { code: '5210', name: 'Electricity Expense', type: 'expense' },
  { code: '5220', name: 'Water Expense', type: 'expense' },
  { code: '5300', name: 'Other Utilities Expense', type: 'expense' },
  { code: '5400', name: 'Office Supplies Expense', type: 'expense' },
  { code: '5900', name: 'Other Expense', type: 'expense' },
];

// Ensure the default Chart of Accounts exists. Upserts by code so accounts
// added later (e.g. splitting Utilities into Electricity/Water) still show
// up for installs that were already seeded before this change.
async function ensureDefaultAccounts() {
  const existing = await prisma.account.findMany({ select: { code: true } });
  const existingCodes = new Set(existing.map((a) => a.code));
  const missing = DEFAULT_ACCOUNTS.filter((a) => !existingCodes.has(a.code));
  if (missing.length > 0) await prisma.account.createMany({ data: missing });
}

router.get('/', async (req, res) => {
  await ensureDefaultAccounts();
  const accounts = await prisma.account.findMany({ orderBy: { code: 'asc' } });
  res.json(accounts);
});

router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  const { code, name, type } = req.body;
  if (!code || !name || !type) return res.status(400).json({ error: 'code, name, type required' });
  const account = await prisma.account.create({ data: { code, name, type } });
  res.status(201).json(account);
});

// Ledger for a single account: every journal line posted to it, with a
// running balance. Optionally filtered to one business.
router.get('/:id/ledger', async (req, res) => {
  const accountId = Number(req.params.id);
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const where = { accountId };
  if (req.query.businessId) where.journalEntry = { businessId: Number(req.query.businessId) };

  const lines = await prisma.journalLine.findMany({
    where,
    include: { journalEntry: { include: { business: true } } },
    orderBy: { journalEntry: { date: 'asc' } },
  });

  const normalDebit = account.type === 'asset' || account.type === 'expense';
  let running = 0;
  const rows = lines.map((l) => {
    running += normalDebit ? l.debit - l.credit : l.credit - l.debit;
    return {
      id: l.id,
      date: l.journalEntry.date,
      business: l.journalEntry.business.name,
      reference: l.journalEntry.reference,
      description: l.journalEntry.description,
      debit: l.debit,
      credit: l.credit,
      balance: Math.round(running * 100) / 100,
    };
  });
  res.json({ account, lines: rows });
});

module.exports = router;

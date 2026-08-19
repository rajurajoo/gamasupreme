const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await prisma.customer.findMany({ orderBy: { name: 'asc' } }));
});

router.post('/', async (req, res) => {
  const { name, email, phone, address, trn } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const customer = await prisma.customer.create({ data: { name, email, phone, address, trn } });
  res.status(201).json(customer);
});

router.put('/:id', async (req, res) => {
  const { name, email, phone, address, trn } = req.body;
  const customer = await prisma.customer.update({
    where: { id: Number(req.params.id) },
    data: { name, email, phone, address, trn },
  });
  res.json(customer);
});

router.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: Number(req.params.id) } });
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
});

// Statement of Accounts: every invoice ever issued to this customer, across
// all businesses, with a running balance - the standard doc sent to a client
// showing what they've been billed, paid, and still owe.
router.get('/:id/statement', async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: Number(req.params.id) } });
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id },
    include: { items: true, business: true },
    orderBy: { createdAt: 'asc' },
  });

  let runningBalance = 0;
  const rows = invoices.map((inv) => {
    const subtotal = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    const discountPercent = inv.discountPercent != null ? inv.discountPercent : 0;
    const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
    const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;
    const vatRate = inv.vatRate != null ? inv.vatRate : 5;
    const vatAmount = Math.round(afterDiscount * (vatRate / 100) * 100) / 100;
    const totalWithVat = Math.round((afterDiscount + vatAmount) * 100) / 100;
    const balance = Math.round((totalWithVat - inv.amountPaid) * 100) / 100;
    runningBalance = Math.round((runningBalance + balance) * 100) / 100;
    return {
      id: inv.id,
      number: inv.number,
      business: inv.business.name,
      date: inv.createdAt,
      dueDate: inv.dueDate,
      status: inv.status,
      total: totalWithVat,
      paid: inv.amountPaid,
      balance,
      runningBalance,
    };
  });

  const totalInvoiced = Math.round(rows.reduce((s, r) => s + r.total, 0) * 100) / 100;
  const totalPaid = Math.round(rows.reduce((s, r) => s + r.paid, 0) * 100) / 100;
  const totalOutstanding = Math.round(rows.reduce((s, r) => s + r.balance, 0) * 100) / 100;

  res.json({ customer, invoices: rows, totalInvoiced, totalPaid, totalOutstanding });
});

module.exports = router;

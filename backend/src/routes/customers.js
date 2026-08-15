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

module.exports = router;

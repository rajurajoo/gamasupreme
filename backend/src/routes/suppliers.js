const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Suppliers are shared (not business-scoped) since Material Trading is the only
// business that uses them, but kept simple/global like Customers.
router.get('/', async (req, res) => {
  res.json(await prisma.supplier.findMany({ orderBy: { name: 'asc' } }));
});

router.post('/', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name, contact } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const supplier = await prisma.supplier.create({ data: { name, contact } });
  res.status(201).json(supplier);
});

module.exports = router;

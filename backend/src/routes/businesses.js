const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Lists the businesses so the frontend can populate the business switcher.
router.get('/', async (req, res) => {
  const businesses = await prisma.business.findMany({ orderBy: { id: 'asc' } });
  res.json(businesses);
});

// Add a new business/company. Admin only.
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, code, trn } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
  const existing = await prisma.business.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) return res.status(400).json({ error: 'A business with this code already exists' });
  const business = await prisma.business.create({
    data: { name, code: code.toUpperCase(), trn: trn || null },
  });
  res.status(201).json(business);
});

// Update static company details shown on official documents (bank info,
// authorized representative, contact details). Admin only.
router.put('/:id', requireRole('admin'), async (req, res) => {
  const {
    trn, email, website, phone,
    bankName, bankAccountTitle, bankCifNumber, bankAccountNumber, bankIban,
    authorizedRepName, authorizedRepDesignation, authorizedRepContact,
  } = req.body;
  const business = await prisma.business.update({
    where: { id: Number(req.params.id) },
    data: {
      trn, email, website, phone,
      bankName, bankAccountTitle, bankCifNumber, bankAccountNumber, bankIban,
      authorizedRepName, authorizedRepDesignation, authorizedRepContact,
    },
  });
  res.json(business);
});

module.exports = router;

const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Lists the three businesses so the frontend can populate the business switcher.
router.get('/', async (req, res) => {
  const businesses = await prisma.business.findMany({ orderBy: { id: 'asc' } });
  res.json(businesses);
});

module.exports = router;

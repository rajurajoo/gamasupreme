const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Simple user list/management - admin only.
router.get('/', requireRole('admin'), async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  res.json(users);
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role required' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hash, role } });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const { active, role } = req.body;
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { active, role },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  res.json(user);
});

module.exports = router;

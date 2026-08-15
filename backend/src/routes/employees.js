const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await prisma.employee.findMany({ orderBy: { name: 'asc' } }));
});

// Only admin/accountant manage payroll-related employee records.
router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  const { name, position, monthlySalary, bankName, bankAccount } = req.body;
  if (!name || !position || monthlySalary == null) {
    return res.status(400).json({ error: 'name, position, monthlySalary required' });
  }
  const employee = await prisma.employee.create({
    data: { name, position, monthlySalary: Number(monthlySalary), bankName, bankAccount },
  });
  res.status(201).json(employee);
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  const { name, position, monthlySalary, bankName, bankAccount, active } = req.body;
  const employee = await prisma.employee.update({
    where: { id: Number(req.params.id) },
    data: { name, position, monthlySalary: monthlySalary != null ? Number(monthlySalary) : undefined, bankName, bankAccount, active },
  });
  res.json(employee);
});

module.exports = router;

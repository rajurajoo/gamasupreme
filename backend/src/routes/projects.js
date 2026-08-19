const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function withProgress(p) {
  const total = p.milestones.length;
  const done = p.milestones.filter((m) => m.status === 'done').length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  return { ...p, progress };
}

const include = { milestones: { orderBy: { order: 'asc' } }, customer: true };

router.get('/', requireBusiness, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { businessId: req.businessId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects.map(withProgress));
});

router.get('/:id', async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(withProgress(project));
});

router.post('/', requireBusiness, requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name, code, address, customerId, startDate } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const project = await prisma.project.create({
    data: {
      businessId: req.businessId,
      name,
      code: code || null,
      address,
      customerId: customerId ? Number(customerId) : null,
      startDate: startDate ? new Date(startDate) : null,
      milestones: {
        create: [
          { name: 'Kickoff', status: 'pending', order: 1 },
        ],
      },
    },
    include,
  });
  res.status(201).json(withProgress(project));
});

// Edit project fields (name/code/address/customer/startDate).
router.put('/:id', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name, code, address, customerId, startDate } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (code !== undefined) data.code = code || null;
  if (address !== undefined) data.address = address;
  if (customerId !== undefined) data.customerId = customerId ? Number(customerId) : null;
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
  const project = await prisma.project.update({ where: { id: Number(req.params.id) }, data, include });
  res.json(withProgress(project));
});

// Add a milestone.
router.post('/:id/milestones', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const count = await prisma.milestone.count({ where: { projectId: Number(req.params.id) } });
  await prisma.milestone.create({ data: { projectId: Number(req.params.id), name, order: count + 1 } });
  const project = await prisma.project.findUnique({ where: { id: Number(req.params.id) }, include });
  res.status(201).json(withProgress(project));
});

// Update a milestone's status.
router.put('/:id/milestones/:milestoneId', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { status } = req.body;
  await prisma.milestone.update({ where: { id: Number(req.params.milestoneId) }, data: { status } });
  const project = await prisma.project.findUnique({ where: { id: Number(req.params.id) }, include });
  res.json(withProgress(project));
});

module.exports = router;

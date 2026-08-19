const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

const include = { quotation: true, customer: true, project: true, assignedTo: true, items: true, business: true };

// List job orders for the active business (optionally filtered to one quotation).
router.get('/', requireBusiness, async (req, res) => {
  const where = { businessId: req.businessId };
  if (req.query.quotationId) where.quotationId = Number(req.query.quotationId);
  const jobOrders = await prisma.jobOrder.findMany({
    where,
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(jobOrders);
});

router.get('/:id', async (req, res) => {
  const jobOrder = await prisma.jobOrder.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!jobOrder) return res.status(404).json({ error: 'Not found' });
  res.json(jobOrder);
});

// Create a Job Order from an accepted quotation - copies line items, no
// pricing (this is an internal work order, not sent to the customer).
router.post('/from-quotation/:quotationId', requireRole('admin', 'sales_staff'), async (req, res) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: Number(req.params.quotationId) },
    include: { items: true, business: true },
  });
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  if (quotation.status !== 'accepted') {
    return res.status(400).json({ error: 'Quotation must be accepted before creating a Job Order' });
  }
  const { assignedToId, dueDate, notes } = req.body;

  const jobOrder = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `JO-${quotation.business.code}`);
    return tx.jobOrder.create({
      data: {
        number,
        businessId: quotation.businessId,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        projectId: quotation.projectId,
        assignedToId: assignedToId ? Number(assignedToId) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        items: {
          create: quotation.items.map((i) => ({ description: i.description, qty: i.qty })),
        },
      },
      include,
    });
  });
  res.status(201).json(jobOrder);
});

// Update status / assignment / due date / notes.
router.put('/:id', requireRole('admin', 'sales_staff', 'accountant'), async (req, res) => {
  const { status, assignedToId, dueDate, notes } = req.body;
  const data = {};
  if (status !== undefined) data.status = status;
  if (assignedToId !== undefined) data.assignedToId = assignedToId ? Number(assignedToId) : null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (notes !== undefined) data.notes = notes;

  const jobOrder = await prisma.jobOrder.update({
    where: { id: Number(req.params.id) },
    data,
    include,
  });
  res.json(jobOrder);
});

module.exports = router;

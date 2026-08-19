const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

// Leads are shared across all businesses - no business scoping here.

const include = { assignedTo: true, customer: true, activities: { orderBy: { date: 'desc' } } };

router.get('/', async (req, res) => {
  const where = {};
  if (req.query.stage) where.stage = req.query.stage;
  const leads = await prisma.lead.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json(leads);
});

// Leads with an upcoming or overdue follow-up date (next 7 days, or overdue).
router.get('/reminders', async (req, res) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 7);
  const leads = await prisma.lead.findMany({
    where: {
      nextFollowUpDate: { lte: cutoff },
      stage: { notIn: ['won', 'lost'] },
    },
    include,
    orderBy: { nextFollowUpDate: 'asc' },
  });
  res.json(leads);
});

router.get('/:id', async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json(lead);
});

router.post('/', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name, company, email, phone, source, assignedToId, nextFollowUpDate, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const lead = await prisma.lead.create({
    data: {
      name,
      company: company || null,
      email: email || null,
      phone: phone || null,
      source: source || null,
      assignedToId: assignedToId ? Number(assignedToId) : null,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      notes: notes || null,
    },
    include,
  });
  res.status(201).json(lead);
});

router.put('/:id', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name, company, email, phone, source, stage, assignedToId, nextFollowUpDate, notes } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (company !== undefined) data.company = company;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (source !== undefined) data.source = source;
  if (stage !== undefined) data.stage = stage;
  if (assignedToId !== undefined) data.assignedToId = assignedToId ? Number(assignedToId) : null;
  if (nextFollowUpDate !== undefined) data.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
  if (notes !== undefined) data.notes = notes;

  const lead = await prisma.lead.update({ where: { id: Number(req.params.id) }, data, include });
  res.json(lead);
});

// Log a call/meeting/note/email against this lead. Optionally updates the
// lead's next follow-up date in the same call.
router.post('/:id/activities', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { type, notes, nextFollowUpDate } = req.body;
  if (!type || !notes) return res.status(400).json({ error: 'type and notes required' });

  const activity = await prisma.leadActivity.create({
    data: { leadId: Number(req.params.id), type, notes },
  });
  if (nextFollowUpDate !== undefined) {
    await prisma.lead.update({
      where: { id: Number(req.params.id) },
      data: { nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null },
    });
  }
  res.status(201).json(activity);
});

// Convert a lead into a Customer (creating one if needed) and a blank draft
// Quotation in the CURRENTLY ACTIVE business, so sales staff can fill in items.
router.post('/:id/convert', requireRole('admin', 'sales_staff'), async (req, res) => {
  const businessId = Number(req.headers['x-business-id']);
  if (!businessId) return res.status(400).json({ error: 'Missing x-business-id header - select a business first' });

  const lead = await prisma.lead.findUnique({ where: { id: Number(req.params.id) } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  let customerId = lead.customerId;
  if (!customerId) {
    const customer = await prisma.customer.create({
      data: { name: lead.company || lead.name, email: lead.email, phone: lead.phone },
    });
    customerId = customer.id;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return res.status(400).json({ error: 'Invalid business' });

  const quotation = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `QT-${business.code}`);
    return tx.quotation.create({
      data: {
        number,
        businessId,
        customerId,
        jobType: 'standard',
        jobStage: business.code === 'DM' ? 'Measurement' : null,
        notes: `Converted from lead: ${lead.name}`,
      },
    });
  });

  await prisma.lead.update({
    where: { id: lead.id },
    data: { stage: 'won', customerId },
  });

  res.status(201).json({ quotationId: quotation.id, customerId });
});

module.exports = router;

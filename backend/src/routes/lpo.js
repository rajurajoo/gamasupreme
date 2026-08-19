const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const include = { items: true, project: true, business: true };

function withTotals(lpo) {
  const subtotal = lpo.items.reduce((sum, i) => sum + i.qty * i.unitRate, 0);
  const vatRate = lpo.vatRate != null ? lpo.vatRate : 5;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  return { ...lpo, subtotal, vatAmount, total };
}

// List LPOs - optionally filtered to a project, otherwise all LPOs for the active business.
router.get('/', requireBusiness, async (req, res) => {
  const where = { businessId: req.businessId };
  if (req.query.projectId) where.projectId = Number(req.query.projectId);
  const lpos = await prisma.lPO.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json(lpos.map(withTotals));
});

router.get('/:id', async (req, res) => {
  const lpo = await prisma.lPO.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!lpo) return res.status(404).json({ error: 'Not found' });
  res.json(withTotals(lpo));
});

// Create an LPO for a project. Number is composed as
// "LPO-{project.code or PRJ<id>}-{year}/({serial})".
router.post('/', requireBusiness, requireRole('admin', 'sales_staff'), async (req, res) => {
  const { projectId, serial, supplierName, supplierContact, deliveryAddress, paymentTerms, notes, deliveryDate, items } = req.body;
  if (!projectId || !serial || !supplierName) {
    return res.status(400).json({ error: 'projectId, serial and supplierName are required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
  if (!project) return res.status(400).json({ error: 'Invalid project' });

  const year = new Date().getFullYear();
  const code = project.code && project.code.trim() ? project.code.trim() : `PRJ${project.id}`;
  const number = `LPO-${code}-${year}/(${serial})`;

  const existing = await prisma.lPO.findUnique({ where: { number } });
  if (existing) {
    return res.status(400).json({ error: 'This LPO number already exists — try a different serial' });
  }

  try {
    const lpo = await prisma.lPO.create({
      data: {
        projectId: project.id,
        businessId: req.businessId,
        serial,
        number,
        supplierName,
        supplierContact,
        deliveryAddress,
        paymentTerms,
        notes,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        items: {
          create: items.map((i) => ({
            description: i.description,
            qty: Number(i.qty),
            unit: i.unit || null,
            unitRate: Number(i.unitRate),
          })),
        },
      },
      include,
    });
    res.status(201).json(withTotals(lpo));
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'This LPO number already exists — try a different serial' });
    }
    throw e;
  }
});

// Update status and/or other editable fields.
router.put('/:id', requireRole('admin', 'sales_staff', 'accountant'), async (req, res) => {
  const { status, supplierName, supplierContact, deliveryAddress, paymentTerms, notes, deliveryDate, termsAndConditions, showWatermark } = req.body;
  const data = {};
  if (status !== undefined) data.status = status;
  if (supplierName !== undefined) data.supplierName = supplierName;
  if (supplierContact !== undefined) data.supplierContact = supplierContact;
  if (deliveryAddress !== undefined) data.deliveryAddress = deliveryAddress;
  if (paymentTerms !== undefined) data.paymentTerms = paymentTerms;
  if (notes !== undefined) data.notes = notes;
  if (deliveryDate !== undefined) data.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
  if (termsAndConditions !== undefined) data.termsAndConditions = termsAndConditions;
  if (showWatermark !== undefined) data.showWatermark = Boolean(showWatermark);

  const lpo = await prisma.lPO.update({ where: { id: Number(req.params.id) }, data, include });
  res.json(withTotals(lpo));
});

module.exports = router;

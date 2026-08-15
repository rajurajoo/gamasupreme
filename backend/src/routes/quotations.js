const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

function withTotals(q) {
  const total = q.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  return { ...q, total };
}

const include = { items: { include: { product: true } }, customer: true, project: true, business: true };

router.get('/', requireBusiness, async (req, res) => {
  const quotations = await prisma.quotation.findMany({
    where: { businessId: req.businessId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(quotations.map(withTotals));
});

router.get('/:id', async (req, res) => {
  const q = await prisma.quotation.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!q) return res.status(404).json({ error: 'Not found' });
  res.json(withTotals(q));
});

router.post('/', requireBusiness, requireRole('admin', 'sales_staff'), async (req, res) => {
  const { customerId, jobType, notes, items, projectId } = req.body;
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerId and at least one item required' });
  }
  const business = await prisma.business.findUnique({ where: { id: req.businessId } });
  if (!business) return res.status(400).json({ error: 'Invalid business' });

  const quotation = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `QT-${business.code}`);
    return tx.quotation.create({
      data: {
        number,
        businessId: business.id,
        customerId: Number(customerId),
        projectId: projectId ? Number(projectId) : null,
        jobType: jobType || 'standard',
        notes,
        jobStage: business.code === 'DM' ? 'Measurement' : null,
        items: {
          create: items.map((i) => ({
            description: i.description,
            qty: Number(i.qty),
            unitPrice: Number(i.unitPrice),
            doorWidth: i.doorWidth != null && i.doorWidth !== '' ? Number(i.doorWidth) : null,
            doorHeight: i.doorHeight != null && i.doorHeight !== '' ? Number(i.doorHeight) : null,
            material: i.material || null,
            finish: i.finish || null,
            productId: i.productId ? Number(i.productId) : null,
          })),
        },
      },
      include,
    });
  });
  res.status(201).json(withTotals(quotation));
});

router.put('/:id', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { status, notes, jobStage } = req.body;
  const q = await prisma.quotation.update({
    where: { id: Number(req.params.id) },
    data: { status, notes, jobStage },
    include,
  });
  res.json(withTotals(q));
});

module.exports = router;

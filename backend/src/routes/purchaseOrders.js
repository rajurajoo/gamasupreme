const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

const include = { items: { include: { product: true } }, supplier: true };

function withTotal(po) {
  const total = po.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
  return { ...po, total };
}

// Accountants can view, sales_staff can create/receive.
router.get('/', requireBusiness, async (req, res) => {
  const pos = await prisma.purchaseOrder.findMany({
    where: { businessId: req.businessId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(pos.map(withTotal));
});

router.get('/:id', async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!po) return res.status(404).json({ error: 'Not found' });
  res.json(withTotal(po));
});

router.post('/', requireBusiness, requireRole('admin', 'sales_staff'), async (req, res) => {
  const { supplierId, items } = req.body;
  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'supplierId and at least one item required' });
  }
  const business = await prisma.business.findUnique({ where: { id: req.businessId } });
  if (!business) return res.status(400).json({ error: 'Invalid business' });

  const po = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `PO-${business.code}`);
    return tx.purchaseOrder.create({
      data: {
        number,
        businessId: business.id,
        supplierId: Number(supplierId),
        items: {
          create: items.map((i) => ({ productId: Number(i.productId), qty: Number(i.qty), unitCost: Number(i.unitCost) })),
        },
      },
      include,
    });
  });
  res.status(201).json(withTotal(po));
});

// Mark a PO received - increases stock for each line item.
router.put('/:id/receive', requireRole('admin', 'sales_staff'), async (req, res) => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!po) return res.status(404).json({ error: 'Not found' });
  if (po.status === 'received') return res.status(400).json({ error: 'Already received' });

  const updated = await prisma.$transaction(async (tx) => {
    for (const i of po.items) {
      await tx.product.update({ where: { id: i.productId }, data: { stockQty: { increment: i.qty } } });
    }
    return tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: 'received', receivedAt: new Date() },
      include,
    });
  });
  res.json(withTotal(updated));
});

module.exports = router;

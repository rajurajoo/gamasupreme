const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireBusiness, async (req, res) => {
  const products = await prisma.product.findMany({
    where: { businessId: req.businessId },
    orderBy: { name: 'asc' },
  });
  res.json(products.map((p) => ({ ...p, lowStock: p.stockQty <= p.reorderThreshold })));
});

router.post('/', requireBusiness, requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name, sku, unit, unitCost, stockQty, reorderThreshold } = req.body;
  if (!name || !sku || !unit || unitCost == null) {
    return res.status(400).json({ error: 'name, sku, unit, unitCost required' });
  }
  const product = await prisma.product.create({
    data: {
      businessId: req.businessId,
      name,
      sku,
      unit,
      unitCost: Number(unitCost),
      stockQty: stockQty != null ? Number(stockQty) : 0,
      reorderThreshold: reorderThreshold != null ? Number(reorderThreshold) : 0,
    },
  });
  res.status(201).json(product);
});

router.put('/:id', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { name, unit, unitCost, reorderThreshold } = req.body;
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: {
      name,
      unit,
      unitCost: unitCost != null ? Number(unitCost) : undefined,
      reorderThreshold: reorderThreshold != null ? Number(reorderThreshold) : undefined,
    },
  });
  res.json(product);
});

module.exports = router;

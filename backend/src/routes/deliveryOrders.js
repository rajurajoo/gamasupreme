const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

const include = { items: true, invoice: { include: { quotation: { include: { customer: true } }, customer: true } }, completionCertificate: true, project: true, business: true };

router.get('/', requireBusiness, async (req, res) => {
  const dos = await prisma.deliveryOrder.findMany({
    where: { businessId: req.businessId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(dos);
});

router.get('/:id', async (req, res) => {
  const doc = await prisma.deliveryOrder.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Create a DO FROM an invoice - lists items delivered (defaults to invoice items).
router.post('/from-invoice/:invoiceId', requireRole('admin', 'sales_staff'), async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: Number(req.params.invoiceId) },
    include: { items: true, business: true },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { deliveryDate, signedBy, items } = req.body;
  const sourceItems = Array.isArray(items) && items.length ? items : invoice.items.map((i) => ({ description: i.description, qty: i.qty }));

  const deliveryOrder = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `DO-${invoice.business.code}`);
    return tx.deliveryOrder.create({
      data: {
        number,
        businessId: invoice.businessId,
        invoiceId: invoice.id,
        projectId: invoice.projectId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        signedBy,
        items: { create: sourceItems.map((i) => ({ description: i.description, qty: Number(i.qty) })) },
      },
      include,
    });
  });
  res.status(201).json(deliveryOrder);
});

router.put('/:id', requireRole('admin', 'sales_staff'), async (req, res) => {
  const { signedBy, deliveryDate } = req.body;
  const doc = await prisma.deliveryOrder.update({
    where: { id: Number(req.params.id) },
    data: { signedBy, deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined },
    include,
  });
  res.json(doc);
});

module.exports = router;

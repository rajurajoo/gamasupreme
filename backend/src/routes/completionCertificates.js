const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole, requireBusiness } = require('../middleware/auth');
const { nextDocNumber } = require('../docNumber');

const router = express.Router();
router.use(requireAuth);

const include = { deliveryOrder: { include: { invoice: { include: { quotation: { include: { customer: true } } } } } }, project: true, business: true };

router.get('/', requireBusiness, async (req, res) => {
  const certs = await prisma.completionCertificate.findMany({
    where: { businessId: req.businessId },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json(certs);
});

router.get('/:id', async (req, res) => {
  const cert = await prisma.completionCertificate.findUnique({
    where: { id: Number(req.params.id) },
    include,
  });
  if (!cert) return res.status(404).json({ error: 'Not found' });
  res.json(cert);
});

// Create a Completion Certificate FROM a Delivery Order.
// Only applicable to fitout-type jobs (checked via quotation.jobType).
router.post('/from-delivery-order/:deliveryOrderId', requireRole('admin', 'sales_staff'), async (req, res) => {
  const deliveryOrder = await prisma.deliveryOrder.findUnique({
    where: { id: Number(req.params.deliveryOrderId) },
    include: { invoice: { include: { quotation: true } }, business: true },
  });
  if (!deliveryOrder) return res.status(404).json({ error: 'Delivery order not found' });
  if (!deliveryOrder.invoice.quotation || deliveryOrder.invoice.quotation.jobType !== 'fitout') {
    return res.status(400).json({ error: 'Completion certificates only apply to fitout jobs' });
  }

  const { completionDate, scopeDescription, clientName, clientSignature, signOffDate } = req.body;
  if (!completionDate || !scopeDescription) {
    return res.status(400).json({ error: 'completionDate and scopeDescription required' });
  }

  const cert = await prisma.$transaction(async (tx) => {
    const number = await nextDocNumber(tx, `CC-${deliveryOrder.business.code}`);
    return tx.completionCertificate.create({
      data: {
        number,
        businessId: deliveryOrder.businessId,
        deliveryOrderId: deliveryOrder.id,
        projectId: deliveryOrder.projectId,
        completionDate: new Date(completionDate),
        scopeDescription,
        clientName,
        clientSignature,
        signOffDate: signOffDate ? new Date(signOffDate) : null,
      },
      include,
    });
  });
  res.status(201).json(cert);
});

module.exports = router;

const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Fleet is shared across all businesses - no business scoping here.

router.get('/', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: { assignedTo: true },
    orderBy: { plateNumber: 'asc' },
  });
  res.json(vehicles);
});

router.get('/:id', async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(req.params.id) },
    include: { assignedTo: true, logs: { include: { driver: true }, orderBy: { date: 'desc' } } },
  });
  if (!vehicle) return res.status(404).json({ error: 'Not found' });
  res.json(vehicle);
});

router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  const { plateNumber, makeModel, year, assignedToId } = req.body;
  if (!plateNumber || !makeModel) return res.status(400).json({ error: 'plateNumber and makeModel required' });
  const vehicle = await prisma.vehicle.create({
    data: { plateNumber, makeModel, year: year || null, assignedToId: assignedToId ? Number(assignedToId) : null },
    include: { assignedTo: true },
  });
  res.status(201).json(vehicle);
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  const { plateNumber, makeModel, year, assignedToId, active } = req.body;
  const data = {};
  if (plateNumber !== undefined) data.plateNumber = plateNumber;
  if (makeModel !== undefined) data.makeModel = makeModel;
  if (year !== undefined) data.year = year;
  if (assignedToId !== undefined) data.assignedToId = assignedToId ? Number(assignedToId) : null;
  if (active !== undefined) data.active = active;
  const vehicle = await prisma.vehicle.update({ where: { id: Number(req.params.id) }, data, include: { assignedTo: true } });
  res.json(vehicle);
});

// Add a trip log entry.
router.post('/:id/logs', requireRole('admin', 'accountant'), async (req, res) => {
  const { driverId, date, purpose, destination, odometerStart, odometerEnd, fuelCost, notes } = req.body;
  const log = await prisma.vehicleLog.create({
    data: {
      vehicleId: Number(req.params.id),
      driverId: driverId ? Number(driverId) : null,
      date: date ? new Date(date) : new Date(),
      purpose: purpose || null,
      destination: destination || null,
      odometerStart: odometerStart !== '' && odometerStart != null ? Number(odometerStart) : null,
      odometerEnd: odometerEnd !== '' && odometerEnd != null ? Number(odometerEnd) : null,
      fuelCost: fuelCost !== '' && fuelCost != null ? Number(fuelCost) : null,
      notes: notes || null,
    },
    include: { driver: true },
  });
  res.status(201).json(log);
});

router.delete('/:id/logs/:logId', requireRole('admin', 'accountant'), async (req, res) => {
  await prisma.vehicleLog.delete({ where: { id: Number(req.params.logId) } });
  res.json({ ok: true });
});

module.exports = router;

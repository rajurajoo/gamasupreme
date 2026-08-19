const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'employees');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB cap

const EXTRA_FIELDS = [
  'dateOfBirth', 'nationality', 'address',
  'idNumber', 'passportNumber', 'visaNumber', 'visaExpiryDate',
  'emergencyContactName', 'emergencyContactPhone',
];

router.get('/', async (req, res) => {
  res.json(await prisma.employee.findMany({ orderBy: { name: 'asc' } }));
});

router.get('/:id', async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: Number(req.params.id) },
    include: { documents: { orderBy: { uploadedAt: 'desc' } } },
  });
  if (!employee) return res.status(404).json({ error: 'Not found' });
  res.json(employee);
});

// Only admin/accountant manage payroll-related employee records.
router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  const { name, position, monthlySalary, bankName, bankAccount } = req.body;
  if (!name || !position || monthlySalary == null) {
    return res.status(400).json({ error: 'name, position, monthlySalary required' });
  }
  const data = { name, position, monthlySalary: Number(monthlySalary), bankName, bankAccount };
  for (const f of EXTRA_FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  const employee = await prisma.employee.create({ data });
  res.status(201).json(employee);
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  const { name, position, monthlySalary, bankName, bankAccount, active } = req.body;
  const data = { name, position, monthlySalary: monthlySalary != null ? Number(monthlySalary) : undefined, bankName, bankAccount, active };
  for (const f of EXTRA_FIELDS) if (req.body[f] !== undefined) data[f] = req.body[f];
  const employee = await prisma.employee.update({
    where: { id: Number(req.params.id) },
    data,
  });
  res.json(employee);
});

// Upload a document against an employee. Field name must be "file".
router.post('/:id/documents', requireRole('admin', 'accountant'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const label = req.body.label || 'Other';
  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: Number(req.params.id),
      label,
      fileName: req.file.originalname,
      filePath: req.file.filename,
    },
  });
  res.status(201).json(doc);
});

router.delete('/:id/documents/:docId', requireRole('admin', 'accountant'), async (req, res) => {
  const doc = await prisma.employeeDocument.findUnique({ where: { id: Number(req.params.docId) } });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  await prisma.employeeDocument.delete({ where: { id: doc.id } });
  const filePath = path.join(UPLOAD_DIR, doc.filePath);
  fs.unlink(filePath, () => {}); // best-effort, ignore if already gone
  res.json({ ok: true });
});

module.exports = router;

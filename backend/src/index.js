require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const employeeRoutes = require('./routes/employees');
const userRoutes = require('./routes/users');
const businessRoutes = require('./routes/businesses');
const quotationRoutes = require('./routes/quotations');
const invoiceRoutes = require('./routes/invoices');
const deliveryOrderRoutes = require('./routes/deliveryOrders');
const completionCertificateRoutes = require('./routes/completionCertificates');
const payrollRoutes = require('./routes/payroll');
const reportRoutes = require('./routes/reports');
const projectRoutes = require('./routes/projects');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendance');
const lpoRoutes = require('./routes/lpo');
const pettyCashRoutes = require('./routes/pettyCash');
const jobOrderRoutes = require('./routes/jobOrders');
const leadRoutes = require('./routes/leads');
const accountRoutes = require('./routes/accounts');
const journalEntryRoutes = require('./routes/journalEntries');
const vehicleRoutes = require('./routes/vehicles');
const statementOfAccountRoutes = require('./routes/statementsOfAccount');

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/delivery-orders', deliveryOrderRoutes);
app.use('/api/completion-certificates', completionCertificateRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/lpos', lpoRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/job-orders', jobOrderRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/journal-entries', journalEntryRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/statements-of-account', statementOfAccountRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`GAMA SUPREME backend listening on :${PORT}`));

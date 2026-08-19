import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import Users from './pages/Users';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationDetail from './pages/QuotationDetail';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import DeliveryOrders from './pages/DeliveryOrders';
import DeliveryOrderDetail from './pages/DeliveryOrderDetail';
import CompletionCertificates from './pages/CompletionCertificates';
import CompletionCertificateDetail from './pages/CompletionCertificateDetail';
import Payroll from './pages/Payroll';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';
import LPODetail from './pages/LPODetail';
import LPOs from './pages/LPOs';
import PettyCash from './pages/PettyCash';
import PettyCashVoucher from './pages/PettyCashVoucher';
import JobOrders from './pages/JobOrders';
import JobOrderDetail from './pages/JobOrderDetail';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Accounts from './pages/Accounts';
import CustomerStatement from './pages/CustomerStatement';
import StatementOfAccountDetail from './pages/StatementOfAccountDetail';
import EmployeeDetail from './pages/EmployeeDetail';
import Vehicles from './pages/Vehicles';
import AccountsDepartment from './pages/AccountsDepartment';
import VehicleDetail from './pages/VehicleDetail';
import AccountLedger from './pages/AccountLedger';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/customers" element={<Protected><Customers /></Protected>} />
      <Route path="/employees" element={<Protected><Employees /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="/quotations" element={<Protected><Quotations /></Protected>} />
      <Route path="/quotations/new" element={<Protected><QuotationForm /></Protected>} />
      <Route path="/quotations/:id" element={<Protected><QuotationDetail /></Protected>} />
      <Route path="/invoices" element={<Protected><Invoices /></Protected>} />
      <Route path="/invoices/new" element={<Protected><InvoiceForm /></Protected>} />
      <Route path="/invoices/:id" element={<Protected><InvoiceDetail /></Protected>} />
      <Route path="/delivery-orders" element={<Protected><DeliveryOrders /></Protected>} />
      <Route path="/delivery-orders/:id" element={<Protected><DeliveryOrderDetail /></Protected>} />
      <Route path="/completion-certificates" element={<Protected><CompletionCertificates /></Protected>} />
      <Route path="/completion-certificates/:id" element={<Protected><CompletionCertificateDetail /></Protected>} />
      <Route path="/payroll" element={<Protected><Payroll /></Protected>} />
      <Route path="/petty-cash" element={<Protected><PettyCash /></Protected>} />
      <Route path="/petty-cash/:id/voucher" element={<Protected><PettyCashVoucher /></Protected>} />
      <Route path="/job-orders" element={<Protected><JobOrders /></Protected>} />
      <Route path="/job-orders/:id" element={<Protected><JobOrderDetail /></Protected>} />
      <Route path="/leads" element={<Protected><Leads /></Protected>} />
      <Route path="/leads/:id" element={<Protected><LeadDetail /></Protected>} />
      <Route path="/accounts" element={<Protected><Accounts /></Protected>} />
      <Route path="/accounts/:id/ledger" element={<Protected><AccountLedger /></Protected>} />
      <Route path="/customers/:id/statement" element={<Protected><CustomerStatement /></Protected>} />
      <Route path="/statements-of-account/:id" element={<Protected><StatementOfAccountDetail /></Protected>} />
      <Route path="/employees/:id" element={<Protected><EmployeeDetail /></Protected>} />
      <Route path="/vehicles" element={<Protected><Vehicles /></Protected>} />
      <Route path="/vehicles/:id" element={<Protected><VehicleDetail /></Protected>} />
      <Route path="/accounts-department" element={<Protected><AccountsDepartment /></Protected>} />
      <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/projects" element={<Protected><Projects /></Protected>} />
      <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
      <Route path="/products" element={<Protected><Products /></Protected>} />
      <Route path="/purchase-orders" element={<Protected><PurchaseOrders /></Protected>} />
      <Route path="/lpos" element={<Protected><LPOs /></Protected>} />
      <Route path="/lpos/:id" element={<Protected><LPODetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

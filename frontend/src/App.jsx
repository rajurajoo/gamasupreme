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
import InvoiceDetail from './pages/InvoiceDetail';
import DeliveryOrders from './pages/DeliveryOrders';
import DeliveryOrderDetail from './pages/DeliveryOrderDetail';
import CompletionCertificates from './pages/CompletionCertificates';
import CompletionCertificateDetail from './pages/CompletionCertificateDetail';
import Payroll from './pages/Payroll';
import Reports from './pages/Reports';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';

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
      <Route path="/invoices/:id" element={<Protected><InvoiceDetail /></Protected>} />
      <Route path="/delivery-orders" element={<Protected><DeliveryOrders /></Protected>} />
      <Route path="/delivery-orders/:id" element={<Protected><DeliveryOrderDetail /></Protected>} />
      <Route path="/completion-certificates" element={<Protected><CompletionCertificates /></Protected>} />
      <Route path="/completion-certificates/:id" element={<Protected><CompletionCertificateDetail /></Protected>} />
      <Route path="/payroll" element={<Protected><Payroll /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/projects" element={<Protected><Projects /></Protected>} />
      <Route path="/projects/:id" element={<Protected><ProjectDetail /></Protected>} />
      <Route path="/products" element={<Protected><Products /></Protected>} />
      <Route path="/purchase-orders" element={<Protected><PurchaseOrders /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

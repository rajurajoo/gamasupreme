import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';
import logoIcon from './assets/logo-icon.png';

const icon = (path) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const ICONS = {
  dashboard: icon(<><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>),
  leads: icon(<><path d="M4 4h16v4l-6 6v6l-4-2v-4L4 8Z" /></>),
  quotations: icon(<><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M15 3v4h4" /><path d="M9 12h6M9 16h6" /></>),
  invoices: icon(<><path d="M6 2h9l4 4v16H6V2Z" /><path d="M15 2v4h4" /><path d="M9 11h6M9 15h6M9 19h3" /></>),
  delivery: icon(<><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" /></>),
  certs: icon(<><circle cx="12" cy="9" r="6" /><path d="M9 14 7 22l5-3 5 3-2-8" /></>),
  products: icon(<><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5M12 13v8" /></>),
  purchase: icon(<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6" /></>),
  customers: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /><circle cx="17.5" cy="8.5" r="2.7" /><path d="M15.8 13.6c2.6.6 4.7 2.9 4.7 6.4" /></>),
  employees: icon(<><rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>),
  payroll: icon(<><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /><circle cx="7" cy="14.5" r="1.4" /></>),
  pettyCash: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2.2-3 2.5c-1.7.3-3 1.1-3 2.5s1.3 2.5 3 2.5 3-1.1 3-2.5" /></>),
  jobOrder: icon(<><path d="M9 4h6v3H9z" /><rect x="4" y="4" width="16" height="17" rx="2" /><path d="m9 12 2 2 4-4" /></>),
  attendance: icon(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="m8 14 2.5 2.5L16 11" /></>),
  vehicles: icon(<><path d="M3 13 5 7h10l4 6" /><rect x="2" y="13" width="20" height="6" rx="1.5" /><circle cx="7" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /></>),
  reports: icon(<><path d="M4 19V5M4 19h16" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="14" width="3" height="4" /></>),
  accounts: icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 14h3M8 17h6" /></>),
  users: icon(<><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
  projects: icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></>),
  lpo: icon(<><path d="M6 2h12l3 4v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" /><path d="M18 2v4h3" /><path d="M8 11h8M8 15h5" /></>),
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { businesses, businessId, activeBusiness, setBusinessId, loadError, retryLoadBusinesses } = useBusiness();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const code = activeBusiness?.code;
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="layout">
      <div className="topbar no-print">
        <h2 className="brand-wordmark"><img src={logoIcon} alt="" />GAMA SUPREME</h2>
        <div className="business-switcher">
          <span className="business-switcher-label">Active Business</span>
          <div className="business-tabs">
            {businesses.map((b) => (
              <button
                type="button"
                key={b.id}
                className={'business-tab' + (b.id === businessId ? ' active' : '')}
                onClick={() => { setBusinessId(b.id); navigate('/'); }}
              >
                {b.name}
              </button>
            ))}
            {loadError && (
              <button type="button" className="business-tab business-tab-retry" onClick={retryLoadBusinesses}>
                Couldn't load businesses — Retry
              </button>
            )}
          </div>
        </div>
        <div className="user-info">
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--brand)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {initial}
          </span>
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role.replace('_', ' ')}</span>
          <button className="logout" onClick={handleLogout}>Log out</button>
        </div>
      </div>
      <div className="body-row">
        <div className="sidebar no-print">
          <p className="sidebar-logo"><img src={logoIcon} alt="" />GAMA SUPREME</p>
          <nav>
            <NavLink to="/">{ICONS.dashboard}<span>Dashboard</span></NavLink>
            <NavLink to="/leads">{ICONS.leads}<span>Sales CRM</span></NavLink>
            <NavLink to="/quotations">{ICONS.quotations}<span>Quotations</span></NavLink>
            <NavLink to="/job-orders">{ICONS.jobOrder}<span>Job Orders</span></NavLink>
            <NavLink to="/invoices">{ICONS.invoices}<span>Invoices</span></NavLink>
            <NavLink to="/delivery-orders">{ICONS.delivery}<span>Delivery Orders</span></NavLink>
            <NavLink to="/completion-certificates">{ICONS.certs}<span>Completion Certs</span></NavLink>
            <NavLink to="/projects">{ICONS.projects}<span>Projects</span></NavLink>
            <NavLink to="/lpos">{ICONS.lpo}<span>LPOs</span></NavLink>
            {code === 'MT' && <NavLink to="/products">{ICONS.products}<span>Products</span></NavLink>}
            {code === 'MT' && <NavLink to="/purchase-orders">{ICONS.purchase}<span>Purchase Orders</span></NavLink>}
            <NavLink to="/customers">{ICONS.customers}<span>Customers</span></NavLink>
            {(user.role === 'admin' || user.role === 'accountant') && (
              <>
                <p className="sidebar-section-label">HR</p>
                <NavLink to="/employees">{ICONS.employees}<span>Employees</span></NavLink>
                <NavLink to="/attendance">{ICONS.attendance}<span>Attendance</span></NavLink>
                <NavLink to="/vehicles">{ICONS.vehicles}<span>Vehicle Log Book</span></NavLink>

                <p className="sidebar-section-label">Accounts Department</p>
                <NavLink to="/accounts-department">{ICONS.dashboard}<span>Dashboard</span></NavLink>
                <NavLink to="/accounts">{ICONS.accounts}<span>Chart of Accounts</span></NavLink>
                <NavLink to="/payroll">{ICONS.payroll}<span>Payroll</span></NavLink>
                <NavLink to="/petty-cash">{ICONS.pettyCash}<span>Petty Cash</span></NavLink>
                <NavLink to="/reports">{ICONS.reports}<span>Auditing Report</span></NavLink>
              </>
            )}
            {user.role === 'admin' && <NavLink to="/users">{ICONS.users}<span>Users</span></NavLink>}
          </nav>
        </div>
        <div className="main-col">
          <div className="content">{children}</div>
        </div>
      </div>
    </div>
  );
}

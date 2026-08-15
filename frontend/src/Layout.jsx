import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useBusiness } from './BusinessContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { businesses, businessId, activeBusiness, setBusinessId } = useBusiness();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const code = activeBusiness?.code;

  return (
    <div className="layout">
      <div className="topbar no-print">
        <h2 className="brand-wordmark">GAMA SUPREME</h2>
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
          </div>
        </div>
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role.replace('_', ' ')}</span>
          <button className="logout" onClick={handleLogout}>Log out</button>
        </div>
      </div>
      <div className="body-row">
        <div className="sidebar no-print">
          <nav>
            <NavLink to="/">Dashboard</NavLink>
            <NavLink to="/quotations">Quotations</NavLink>
            <NavLink to="/invoices">Invoices</NavLink>
            <NavLink to="/delivery-orders">Delivery Orders</NavLink>
            <NavLink to="/completion-certificates">Completion Certs</NavLink>
            {code === 'FO' && <NavLink to="/projects">Projects</NavLink>}
            {code === 'MT' && <NavLink to="/products">Products</NavLink>}
            {code === 'MT' && <NavLink to="/purchase-orders">Purchase Orders</NavLink>}
            <NavLink to="/customers">Customers</NavLink>
            {(user.role === 'admin' || user.role === 'accountant') && (
              <>
                <NavLink to="/employees">Employees</NavLink>
                <NavLink to="/payroll">Payroll</NavLink>
                <NavLink to="/reports">Auditing Report</NavLink>
              </>
            )}
            {user.role === 'admin' && <NavLink to="/users">Users</NavLink>}
          </nav>
        </div>
        <div className="main-col">
          <div className="content">{children}</div>
        </div>
      </div>
    </div>
  );
}

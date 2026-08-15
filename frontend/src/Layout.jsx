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
      <div className="sidebar no-print">
        <h2>GAMA SUPREME</h2>

        <div className="business-switcher">
          <label>Active Business</label>
          <select value={businessId || ''} onChange={(e) => { setBusinessId(Number(e.target.value)); navigate('/'); }}>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

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
        <div className="user-info">
          {user.name}<br />
          <span style={{ textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</span>
          <div><button className="logout" onClick={handleLogout}>Log out</button></div>
        </div>
      </div>
      <div className="content">{children}</div>
    </div>
  );
}

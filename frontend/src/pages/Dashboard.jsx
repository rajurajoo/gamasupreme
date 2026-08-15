import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money } from '../format';
import { useBusiness } from '../BusinessContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { activeBusiness, businessId } = useBusiness();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!businessId) return;
    Promise.all([
      api.get('/quotations'),
      api.get('/invoices'),
      api.get('/delivery-orders'),
    ]).then(([q, inv, dos]) => {
      setCounts({
        quotations: q.length,
        invoices: inv.length,
        deliveryOrders: dos.length,
        outstanding: inv.reduce((s, i) => s + i.balance, 0),
      });
    }).catch(() => {});
  }, [businessId]);

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      {activeBusiness && <p style={{ color: '#6b7280', marginTop: -10 }}>Active business: <strong>{activeBusiness.name}</strong></p>}
      {counts && (
        <div className="report-grid">
          <Link to="/quotations" className="card report-tile">
            <div className="label">Quotations</div>
            <div className="value">{counts.quotations}</div>
          </Link>
          <Link to="/invoices" className="card report-tile">
            <div className="label">Invoices</div>
            <div className="value">{counts.invoices}</div>
          </Link>
          <Link to="/delivery-orders" className="card report-tile">
            <div className="label">Delivery Orders</div>
            <div className="value">{counts.deliveryOrders}</div>
          </Link>
          <div className="card report-tile">
            <div className="label">Outstanding (this business)</div>
            <div className="value">{money(counts.outstanding)}</div>
          </div>
        </div>
      )}
      <div className="card">
        <h3>Document chain</h3>
        <p>Quotation &rarr; Invoice &rarr; Delivery Order &rarr; Completion Certificate (fitout jobs only).</p>
        <p>Use the business switcher in the sidebar to move between Door Manufacturing, Interior Fit-out, and Material Trading. Customers and employees are shared across all businesses; documents and numbering are scoped per business.</p>
      </div>
    </div>
  );
}

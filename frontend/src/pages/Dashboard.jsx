import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money } from '../format';
import { useBusiness } from '../BusinessContext';
import LineAreaChart from '../components/charts/LineAreaChart';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';

const STATUS_COLORS = { unpaid: '#f59e0b', partial: '#3b82f6', paid: '#10b981' };

export default function Dashboard() {
  const { user } = useAuth();
  const { activeBusiness, businessId } = useBusiness();
  const [counts, setCounts] = useState(null);
  const [trend, setTrend] = useState(null);
  const [byBusiness, setByBusiness] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState(null);

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

    api.get('/dashboard/status-breakdown').then(setStatusBreakdown).catch(() => {});
  }, [businessId]);

  useEffect(() => {
    api.get('/dashboard/trend').then(setTrend).catch(() => {});
    api.get('/dashboard/by-business').then(setByBusiness).catch(() => {});
  }, []);

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      {activeBusiness && <p style={{ color: '#6b7280', marginTop: -10 }}>Active business: <strong>{activeBusiness.name}</strong></p>}
      {counts ? (
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
      ) : (
        <div className="report-grid">
          {[0, 1, 2, 3].map((i) => (
            <div className="card report-tile skeleton-tile" key={i}>
              <div className="label">&nbsp;</div>
              <div className="value skeleton skeleton-line" style={{ width: '60%' }}>0</div>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <h3>Revenue trend (last 6 months, all businesses)</h3>
        {trend ? <LineAreaChart data={trend.map((t) => ({ label: t.label, value: t.total }))} /> : <div className="skeleton skeleton-chart" />}
      </div>

      <div className="report-grid" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'stretch' }}>
        <div className="card">
          <h3>Sales by business (all-time)</h3>
          {byBusiness ? <BarChart data={byBusiness.map((b) => ({ label: b.businessCode, value: b.total }))} /> : <div className="skeleton skeleton-chart" />}
        </div>
        <div className="card">
          <h3>Invoice status {activeBusiness ? `(${activeBusiness.name})` : ''}</h3>
          {statusBreakdown ? (
            <DonutChart
              data={statusBreakdown.map((s) => ({ label: s.status, value: s.count, color: STATUS_COLORS[s.status] || '#9ca3af' }))}
            />
          ) : <div className="skeleton skeleton-chart" />}
        </div>
      </div>

      <div className="card">
        <h3>Document chain</h3>
        <p>Quotation &rarr; Invoice &rarr; Delivery Order &rarr; Completion Certificate (fitout jobs only).</p>
        <p>Use the business switcher in the sidebar to move between Door Manufacturing, Interior Fit-out, and Material Trading. Customers and employees are shared across all businesses; documents and numbering are scoped per business.</p>
      </div>
    </div>
  );
}

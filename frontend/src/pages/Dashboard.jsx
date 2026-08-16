import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money } from '../format';
import { useBusiness } from '../BusinessContext';
import LineAreaChart from '../components/charts/LineAreaChart';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';

const STATUS_COLORS = { unpaid: '#fbbf24', partial: '#7c9bff', paid: '#34d399' };

function tileIcon(path) {
  return (
    <span className="icon-badge">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    </span>
  );
}

const TILE_ICONS = {
  quotations: tileIcon(<><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M15 3v4h4" /><path d="M9 12h6M9 16h6" /></>),
  invoices: tileIcon(<><path d="M6 2h9l4 4v16H6V2Z" /><path d="M15 2v4h4" /><path d="M9 11h6M9 15h6M9 19h3" /></>),
  delivery: tileIcon(<><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="18" cy="18" r="1.6" /></>),
  cash: tileIcon(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></>),
};

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
      {activeBusiness && <p style={{ color: 'var(--text-secondary)', marginTop: -10 }}>Active business: <strong>{activeBusiness.name}</strong></p>}
      {counts ? (
        <div className="report-grid">
          <Link to="/quotations" className="card report-tile">
            {TILE_ICONS.quotations}
            <div className="tile-body">
              <div className="value">{counts.quotations}</div>
              <div className="label">Quotations</div>
            </div>
          </Link>
          <Link to="/invoices" className="card report-tile">
            {TILE_ICONS.invoices}
            <div className="tile-body">
              <div className="value">{counts.invoices}</div>
              <div className="label">Invoices</div>
            </div>
          </Link>
          <Link to="/delivery-orders" className="card report-tile">
            {TILE_ICONS.delivery}
            <div className="tile-body">
              <div className="value">{counts.deliveryOrders}</div>
              <div className="label">Delivery Orders</div>
            </div>
          </Link>
          <div className="card report-tile">
            {TILE_ICONS.cash}
            <div className="tile-body">
              <div className="value">{money(counts.outstanding)}</div>
              <div className="label">Outstanding (this business)</div>
            </div>
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

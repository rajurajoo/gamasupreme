import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';

const STATUS_BADGE = { unpaid: 'rejected', partial: 'pending', paid: 'accepted' };

export default function CustomerStatement() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/customers/${id}/statement`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return <p className="hint">Loading...</p>;

  const { customer, invoices, totalInvoiced, totalPaid, totalOutstanding } = data;

  return (
    <div className="print-view">
      <h1 className="no-print">Statement of Accounts</h1>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>{customer.name}</h2>
            <p className="hint" style={{ margin: 0 }}>
              {customer.email} {customer.phone && `· ${customer.phone}`}<br />
              {customer.address}
              {customer.trn && <><br />TRN: {customer.trn}</>}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="hint" style={{ margin: 0 }}>Statement Date</p>
            <p style={{ margin: 0, fontWeight: 700 }}>{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <table style={{ marginTop: 20 }}>
          <thead><tr><th>Date</th><th>Invoice</th><th>Business</th><th>Due Date</th><th>Status</th><th>Total</th><th>Paid</th><th>Balance</th><th>Running Balance</th></tr></thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{new Date(inv.date).toLocaleDateString()}</td>
                <td><Link to={`/invoices/${inv.id}`}>{inv.number}</Link></td>
                <td>{inv.business}</td>
                <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td><span className={`badge ${STATUS_BADGE[inv.status] || ''}`}>{inv.status}</span></td>
                <td>{money(inv.total)}</td>
                <td>{money(inv.paid)}</td>
                <td>{money(inv.balance)}</td>
                <td style={{ fontWeight: 700 }}>{money(inv.runningBalance)}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={9} className="hint">No invoices for this customer yet.</td></tr>
            )}
          </tbody>
        </table>

        <div className="totals" style={{ marginTop: 16 }}>
          <div className="totals-row"><span>Total Invoiced</span><span>{money(totalInvoiced)}</span></div>
          <div className="totals-row"><span>Total Paid</span><span>{money(totalPaid)}</span></div>
          <div className="totals-row grand"><span>Total Outstanding</span><span>{money(totalOutstanding)}</span></div>
        </div>
      </div>

      <div className="card no-print">
        <button className="btn secondary" onClick={() => window.print()}>Print / Export Statement</button>
      </div>
    </div>
  );
}

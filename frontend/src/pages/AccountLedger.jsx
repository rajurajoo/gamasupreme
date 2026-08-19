import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';

export default function AccountLedger() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState('');
  const [error, setError] = useState('');

  function load() {
    const qs = businessId ? `?businessId=${businessId}` : '';
    api.get(`/accounts/${id}/ledger${qs}`).then(setData).catch((e) => setError(e.message));
  }
  useEffect(load, [id, businessId]);
  useEffect(() => { api.get('/businesses').then(setBusinesses); }, []);

  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return <p className="hint">Loading...</p>;

  return (
    <div>
      <h1>Ledger: {data.account.code} - {data.account.name}</h1>

      <div className="card">
        <label>Filter by Business</label>
        <select value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
          <option value="">-- all businesses (combined) --</option>
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Date</th><th>Business</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>
            {data.lines.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.date).toLocaleDateString()}</td>
                <td>{l.business}</td>
                <td>{l.reference || '-'}</td>
                <td>{l.description || '-'}</td>
                <td>{l.debit ? money(l.debit) : '-'}</td>
                <td>{l.credit ? money(l.credit) : '-'}</td>
                <td style={{ fontWeight: 700 }}>{money(l.balance)}</td>
              </tr>
            ))}
            {data.lines.length === 0 && (
              <tr><td colSpan={7} className="hint">No activity on this account yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

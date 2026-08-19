import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';

export default function LPOs() {
  const [lpos, setLpos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/lpos').then(setLpos).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>LPOs (Local Purchase Orders)</h1>
      <p className="hint">LPOs are created from within a Project. Open a project and use the "New LPO" form there.</p>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <table>
          <thead><tr><th>Number</th><th>Project</th><th>Supplier</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lpos.map((l) => (
              <tr key={l.id}>
                <td>{l.number}</td>
                <td>{l.project?.name || '-'}</td>
                <td>{l.supplierName}</td>
                <td>{money(l.total)}</td>
                <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                <td><Link to={`/lpos/${l.id}`}>View</Link></td>
              </tr>
            ))}
            {lpos.length === 0 && (
              <tr><td colSpan={6} className="hint">No LPOs yet for this business.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

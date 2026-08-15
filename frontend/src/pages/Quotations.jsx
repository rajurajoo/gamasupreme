import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';
import { useBusiness } from '../BusinessContext';

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const { businessId } = useBusiness();

  useEffect(() => { if (businessId) api.get('/quotations').then(setQuotations); }, [businessId]);

  return (
    <div>
      <h1>Quotations</h1>
      <div className="actions-bar"><Link className="btn" to="/quotations/new">+ New Quotation</Link></div>
      <div className="card">
        <table>
          <thead><tr><th>Number</th><th>Customer</th><th>Job Type</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id}>
                <td>{q.number}</td>
                <td>{q.customer.name}</td>
                <td>{q.jobType}</td>
                <td>{money(q.total)}</td>
                <td><span className={`badge ${q.status}`}>{q.status}</span></td>
                <td><Link to={`/quotations/${q.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

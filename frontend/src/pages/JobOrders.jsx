import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_BADGE = { pending: 'pending', 'in-progress': 'sent', completed: 'accepted' };
const STATUS_LABEL = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };

export default function JobOrders() {
  const [jobOrders, setJobOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/job-orders').then(setJobOrders).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Job Orders</h1>
      <p className="hint">Job Orders are internal work orders created from an accepted Quotation. Open a quotation and use "Create Job Order".</p>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        <table>
          <thead><tr><th>Number</th><th>Customer</th><th>Assigned To</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {jobOrders.map((jo) => (
              <tr key={jo.id}>
                <td>{jo.number}</td>
                <td>{jo.customer?.name}</td>
                <td>{jo.assignedTo?.name || '-'}</td>
                <td>{jo.dueDate ? new Date(jo.dueDate).toLocaleDateString() : '-'}</td>
                <td><span className={`badge ${STATUS_BADGE[jo.status] || ''}`}>{STATUS_LABEL[jo.status] || jo.status}</span></td>
                <td><Link to={`/job-orders/${jo.id}`}>View</Link></td>
              </tr>
            ))}
            {jobOrders.length === 0 && (
              <tr><td colSpan={6} className="hint">No Job Orders yet for this business.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

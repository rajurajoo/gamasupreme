import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_BADGE = { pending: 'pending', 'in-progress': 'sent', completed: 'accepted' };
const STATUS_LABEL = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };

export default function JobOrderDetail() {
  const { id } = useParams();
  const [jo, setJo] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api.get(`/job-orders/${id}`).then(setJo).catch((e) => setError(e.message));
    api.get('/employees').then((es) => setEmployees(es.filter((e) => e.active)));
  }
  useEffect(load, [id]);

  async function updateField(field, value) {
    setError('');
    try {
      const updated = await api.put(`/job-orders/${id}`, { [field]: value });
      setJo(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !jo) return <div className="error-msg">{error}</div>;
  if (!jo) return <p className="hint">Loading...</p>;

  return (
    <div>
      <h1>Job Order {jo.number} <span className={`badge ${STATUS_BADGE[jo.status] || ''}`}>{STATUS_LABEL[jo.status] || jo.status}</span></h1>

      <div className="card">
        <p><strong>Customer:</strong> {jo.customer?.name}</p>
        {jo.project && <p><strong>Project:</strong> {jo.project.name}</p>}
        <p><strong>From Quotation:</strong> <Link to={`/quotations/${jo.quotationId}`}>{jo.quotation?.number}</Link></p>
        <p><strong>Due Date:</strong> {jo.dueDate ? new Date(jo.dueDate).toLocaleDateString() : '-'}</p>
        {jo.notes && <p><strong>Notes:</strong> {jo.notes}</p>}

        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Description</th><th>Qty</th></tr></thead>
          <tbody>
            {jo.items.map((i) => (
              <tr key={i.id}><td>{i.description}</td><td>{i.qty}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Assignment &amp; Status</h3>
        {error && <div className="error-msg">{error}</div>}
        <label>Assigned To</label>
        <select value={jo.assignedToId || ''} onChange={(e) => updateField('assignedToId', e.target.value || null)}>
          <option value="">-- unassigned --</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
        </select>

        <label>Status</label>
        <select value={jo.status} onChange={(e) => updateField('status', e.target.value)}>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </div>
  );
}

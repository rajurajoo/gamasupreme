import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function DeliveryOrderDetail() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [completionDate, setCompletionDate] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff';

  function load() { api.get(`/delivery-orders/${id}`).then(setDoc); }
  useEffect(load, [id]);

  const isFitout = doc?.invoice.quotation?.jobType === 'fitout';

  async function convertToCC(e) {
    e.preventDefault();
    setError('');
    try {
      const cert = await api.post(`/completion-certificates/from-delivery-order/${id}`, { completionDate, scopeDescription, clientName });
      navigate(`/completion-certificates/${cert.id}`);
    } catch (err) { setError(err.message); }
  }

  if (!doc) return <div>Loading...</div>;
  const customer = doc.invoice.customer || doc.invoice.quotation?.customer;

  return (
    <div className="print-view">
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 6px' }}>GAMA SUPREME - {doc.business?.name}</p>
      <h1>Delivery Order {doc.number}</h1>
      <div className="card">
        <p><strong>Customer:</strong> {customer.name}</p>
        <p><strong>From Invoice:</strong> {doc.invoice.number} &nbsp; <strong>Delivery Date:</strong> {new Date(doc.deliveryDate).toLocaleDateString()}</p>
        <p><strong>Signed By:</strong> {doc.signedBy || '-'}</p>
        {doc.project && <p><strong>Project:</strong> {doc.project.name}</p>}
        <table>
          <thead><tr><th>Description</th><th>Qty Delivered</th></tr></thead>
          <tbody>
            {doc.items.map((i) => (<tr key={i.id}><td>{i.description}</td><td>{i.qty}</td></tr>))}
          </tbody>
        </table>
      </div>

      <div className="card no-print">
        <h3>Actions</h3>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn secondary" onClick={() => window.print()}>Print / Export View</button>

        {doc.completionCertificate && (
          <p style={{ marginTop: 10 }}>Completion certificate already issued: {doc.completionCertificate.number}</p>
        )}

        {canEdit && !doc.completionCertificate && isFitout && (
          <form onSubmit={convertToCC} style={{ marginTop: 20 }}>
            <h3>Convert to Completion Certificate (fitout job)</h3>
            <div className="row">
              <div><label>Completion Date</label><input required type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} /></div>
              <div><label>Client Name (sign-off)</label><input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            </div>
            <label>Scope Description</label>
            <textarea required rows={3} value={scopeDescription} onChange={(e) => setScopeDescription(e.target.value)} />
            <button className="btn" style={{ marginTop: 10 }} type="submit">Create Completion Certificate</button>
          </form>
        )}
        {!isFitout && <p style={{ marginTop: 10 }}>Completion certificates only apply to fitout-type jobs.</p>}
      </div>
    </div>
  );
}

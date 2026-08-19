import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useBusiness } from '../BusinessContext';

const STAGE_LABEL = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', won: 'Won', lost: 'Lost' };
const STAGE_BADGE = { new: 'pending', contacted: 'sent', qualified: 'sent', won: 'accepted', lost: 'rejected' };
const ACTIVITY_TYPES = ['call', 'meeting', 'note', 'email'];

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');
  const [actType, setActType] = useState('call');
  const [actNotes, setActNotes] = useState('');
  const [actFollowUp, setActFollowUp] = useState('');
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();

  function load() {
    api.get(`/leads/${id}`).then(setLead).catch((e) => setError(e.message));
    api.get('/employees').then((es) => setEmployees(es.filter((e) => e.active)));
  }
  useEffect(load, [id]);

  async function updateField(field, value) {
    setError('');
    try {
      const updated = await api.put(`/leads/${id}`, { [field]: value });
      setLead(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addActivity(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/leads/${id}/activities`, { type: actType, notes: actNotes, nextFollowUpDate: actFollowUp || null });
      setActNotes('');
      setActFollowUp('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function convertToQuotation() {
    setError('');
    try {
      const result = await api.post(`/leads/${id}/convert`, {});
      navigate(`/quotations/${result.quotationId}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !lead) return <div className="error-msg">{error}</div>;
  if (!lead) return <p className="hint">Loading...</p>;

  return (
    <div>
      <h1>{lead.name} <span className={`badge ${STAGE_BADGE[lead.stage]}`}>{STAGE_LABEL[lead.stage]}</span></h1>

      <div className="card">
        <p><strong>Company:</strong> {lead.company || '-'}</p>
        <p><strong>Email:</strong> {lead.email || '-'} &nbsp; <strong>Phone:</strong> {lead.phone || '-'}</p>
        <p><strong>Source:</strong> {lead.source || '-'}</p>
        {lead.notes && <p><strong>Notes:</strong> {lead.notes}</p>}
        {lead.customer && <p><strong>Converted Customer:</strong> {lead.customer.name}</p>}
        {error && <div className="error-msg">{error}</div>}

        <label>Stage</label>
        <select value={lead.stage} onChange={(e) => updateField('stage', e.target.value)}>
          {Object.keys(STAGE_LABEL).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>

        <label>Assigned To</label>
        <select value={lead.assignedToId || ''} onChange={(e) => updateField('assignedToId', e.target.value || null)}>
          <option value="">-- unassigned --</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <label>Next Follow-up Date</label>
        <input type="date" value={lead.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : ''} onChange={(e) => updateField('nextFollowUpDate', e.target.value || null)} />

        {lead.stage !== 'won' && lead.stage !== 'lost' && (
          <button className="btn" style={{ marginTop: 14 }} onClick={convertToQuotation}>
            Convert to Quotation ({activeBusiness?.name})
          </button>
        )}
        {lead.quotationLink && <Link to={lead.quotationLink}>View Quotation</Link>}
      </div>

      <div className="card">
        <h3>Activity Log</h3>
        <form onSubmit={addActivity}>
          <div className="row">
            <div>
              <label>Type</label>
              <select value={actType} onChange={(e) => setActType(e.target.value)}>
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label>Next Follow-up (optional)</label>
              <input type="date" value={actFollowUp} onChange={(e) => setActFollowUp(e.target.value)} />
            </div>
          </div>
          <label>Notes</label>
          <input required value={actNotes} onChange={(e) => setActNotes(e.target.value)} placeholder="What happened?" />
          <button className="btn secondary" style={{ marginTop: 10 }} type="submit">Log Activity</button>
        </form>

        <table style={{ marginTop: 16 }}>
          <thead><tr><th>Date</th><th>Type</th><th>Notes</th></tr></thead>
          <tbody>
            {lead.activities.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.date).toLocaleDateString()}</td>
                <td style={{ textTransform: 'capitalize' }}>{a.type}</td>
                <td>{a.notes}</td>
              </tr>
            ))}
            {lead.activities.length === 0 && (
              <tr><td colSpan={3} className="hint">No activities logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

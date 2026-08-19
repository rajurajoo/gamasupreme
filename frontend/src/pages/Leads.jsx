import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STAGES = ['new', 'contacted', 'qualified', 'won', 'lost'];
const STAGE_LABEL = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', won: 'Won', lost: 'Lost' };
const STAGE_BADGE = { new: 'pending', contacted: 'sent', qualified: 'sent', won: 'accepted', lost: 'rejected' };

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get('/leads').then(setLeads);
    api.get('/leads/reminders').then(setReminders);
  }
  useEffect(load, []);

  async function createLead(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/leads', { name, company, email, phone, source });
      setName(''); setCompany(''); setEmail(''); setPhone(''); setSource('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Sales CRM - Leads</h1>

      {reminders.length > 0 && (
        <div className="card">
          <h3>Follow-ups Due (next 7 days)</h3>
          <table>
            <thead><tr><th>Lead</th><th>Follow-up Date</th><th>Stage</th><th></th></tr></thead>
            <tbody>
              {reminders.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}{r.company ? ` (${r.company})` : ''}</td>
                  <td>{new Date(r.nextFollowUpDate).toLocaleDateString()}</td>
                  <td><span className={`badge ${STAGE_BADGE[r.stage]}`}>{STAGE_LABEL[r.stage]}</span></td>
                  <td><Link to={`/leads/${r.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <h3>New Lead</h3>
        <form onSubmit={createLead}>
          <div className="row">
            <div><label>Name</label><input required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label>Company</label><input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <label>Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">-- select --</option>
            <option value="referral">Referral</option>
            <option value="website">Website</option>
            <option value="walk-in">Walk-in</option>
            <option value="other">Other</option>
          </select>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Add Lead</button>
        </form>
      </div>

      <div className="card">
        <h3>All Leads</h3>
        <table>
          <thead><tr><th>Name</th><th>Company</th><th>Stage</th><th>Assigned To</th><th>Next Follow-up</th><th></th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.company || '-'}</td>
                <td><span className={`badge ${STAGE_BADGE[l.stage]}`}>{STAGE_LABEL[l.stage]}</span></td>
                <td>{l.assignedTo?.name || '-'}</td>
                <td>{l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toLocaleDateString() : '-'}</td>
                <td><Link to={`/leads/${l.id}`}>View</Link></td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} className="hint">No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

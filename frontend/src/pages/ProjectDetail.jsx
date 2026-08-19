import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money } from '../format';

const emptyLpoItem = { description: '', qty: 1, unit: '', unitRate: 0 };

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [milestoneName, setMilestoneName] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff';
  const canEditAccounts = canEdit || user.role === 'accountant';
  const navigate = useNavigate();

  const [soas, setSoas] = useState([]);
  const [soaError, setSoaError] = useState('');
  const [generatingSoa, setGeneratingSoa] = useState(false);

  const [lpos, setLpos] = useState([]);
  const [showLpoForm, setShowLpoForm] = useState(false);
  const [lpoSerial, setLpoSerial] = useState('');
  const [lpoSupplierName, setLpoSupplierName] = useState('');
  const [lpoSupplierContact, setLpoSupplierContact] = useState('');
  const [lpoDeliveryAddress, setLpoDeliveryAddress] = useState('');
  const [lpoPaymentTerms, setLpoPaymentTerms] = useState('');
  const [lpoDeliveryDate, setLpoDeliveryDate] = useState('');
  const [lpoNotes, setLpoNotes] = useState('');
  const [lpoItems, setLpoItems] = useState([{ ...emptyLpoItem }]);
  const [lpoError, setLpoError] = useState('');

  function load() { api.get(`/projects/${id}`).then(setProject); }
  function loadLpos() { api.get(`/lpos?projectId=${id}`).then(setLpos); }
  function loadSoas() { api.get(`/statements-of-account?projectId=${id}`).then(setSoas); }
  useEffect(load, [id]);
  useEffect(loadLpos, [id]);
  useEffect(loadSoas, [id]);

  async function generateSoa() {
    setSoaError('');
    setGeneratingSoa(true);
    try {
      const soa = await api.post(`/statements-of-account/project/${id}`, {});
      navigate(`/statements-of-account/${soa.id}`);
    } catch (err) {
      setSoaError(err.message);
    } finally {
      setGeneratingSoa(false);
    }
  }

  function updateLpoItem(idx, field, value) {
    const next = [...lpoItems];
    next[idx][field] = value;
    setLpoItems(next);
  }
  function addLpoItem() { setLpoItems([...lpoItems, { ...emptyLpoItem }]); }
  function removeLpoItem(idx) { setLpoItems(lpoItems.filter((_, i) => i !== idx)); }

  const lpoSubtotal = lpoItems.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.unitRate) || 0), 0);
  const lpoVat = lpoSubtotal * 0.05;
  const lpoTotal = lpoSubtotal + lpoVat;

  const currentYear = new Date().getFullYear();
  const lpoCodePart = project?.code || (project ? `PRJ${project.id}` : '');
  const lpoNumberPreview = lpoSerial ? `LPO-${lpoCodePart}-${currentYear}/(${lpoSerial})` : `LPO-${lpoCodePart}-${currentYear}/(...)`;

  async function submitLpo(e) {
    e.preventDefault();
    setLpoError('');
    try {
      await api.post('/lpos', {
        projectId: Number(id),
        serial: lpoSerial,
        supplierName: lpoSupplierName,
        supplierContact: lpoSupplierContact,
        deliveryAddress: lpoDeliveryAddress,
        paymentTerms: lpoPaymentTerms,
        notes: lpoNotes,
        deliveryDate: lpoDeliveryDate || null,
        items: lpoItems,
      });
      setLpoSerial(''); setLpoSupplierName(''); setLpoSupplierContact('');
      setLpoDeliveryAddress(''); setLpoPaymentTerms(''); setLpoDeliveryDate(''); setLpoNotes('');
      setLpoItems([{ ...emptyLpoItem }]);
      setShowLpoForm(false);
      loadLpos();
    } catch (err) { setLpoError(err.message); }
  }

  async function addMilestone(e) {
    e.preventDefault();
    setError('');
    try { await api.post(`/projects/${id}/milestones`, { name: milestoneName }); setMilestoneName(''); load(); }
    catch (err) { setError(err.message); }
  }

  async function setStatus(milestoneId, status) {
    try { await api.put(`/projects/${id}/milestones/${milestoneId}`, { status }); load(); }
    catch (err) { setError(err.message); }
  }

  if (!project) return <div>Loading...</div>;

  return (
    <div>
      <h1>{project.name}</h1>
      <div className="card">
        <p><strong>Client:</strong> {project.customer?.name || '-'}</p>
        <p><strong>Address:</strong> {project.address || '-'}</p>
        <p><strong>Start Date:</strong> {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</p>
        <p><strong>Overall Progress:</strong> {project.progress}%</p>
        <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
          <div style={{ background: 'var(--brand-gradient)', height: '100%', width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="card">
        <h3>Milestones</h3>
        <table>
          <thead><tr><th>Name</th><th>Status</th>{canEdit && <th>Update</th>}</tr></thead>
          <tbody>
            {project.milestones.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                {canEdit && (
                  <td>
                    <select value={m.status} onChange={(e) => setStatus(m.id, e.target.value)}>
                      <option value="pending">pending</option>
                      <option value="in-progress">in-progress</option>
                      <option value="done">done</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {canEdit && (
          <form onSubmit={addMilestone} style={{ marginTop: 14 }}>
            <label>New Milestone</label>
            <div className="row">
              <input required value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} placeholder="e.g. Flooring installation" />
              <button className="btn small" type="submit">Add</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
          </form>
        )}
      </div>

      <div className="card">
        <h3>LPOs (Local Purchase Orders)</h3>
        {lpos.length > 0 ? (
          <table>
            <thead><tr><th>Number</th><th>Supplier</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {lpos.map((l) => (
                <tr key={l.id}>
                  <td>{l.number}</td>
                  <td>{l.supplierName}</td>
                  <td>{money(l.total)}</td>
                  <td><span className={`badge ${l.status}`}>{l.status}</span></td>
                  <td><Link to={`/lpos/${l.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No LPOs yet for this project.</p>
        )}

        {canEdit && (
          <div style={{ marginTop: 14 }}>
            {!showLpoForm ? (
              <button className="btn small" type="button" onClick={() => setShowLpoForm(true)}>+ New LPO</button>
            ) : (
              <form onSubmit={submitLpo}>
                <div className="row">
                  <div>
                    <label>Serial (e.g. P01)</label>
                    <input required value={lpoSerial} onChange={(e) => setLpoSerial(e.target.value)} placeholder="e.g. P01" />
                  </div>
                  <div>
                    <label>LPO Number Preview</label>
                    <input value={lpoNumberPreview} readOnly disabled />
                  </div>
                </div>
                <div className="row">
                  <div><label>Supplier Name</label><input required value={lpoSupplierName} onChange={(e) => setLpoSupplierName(e.target.value)} /></div>
                  <div><label>Supplier Contact</label><input value={lpoSupplierContact} onChange={(e) => setLpoSupplierContact(e.target.value)} /></div>
                </div>
                <div className="row">
                  <div><label>Delivery Address</label><input value={lpoDeliveryAddress} onChange={(e) => setLpoDeliveryAddress(e.target.value)} /></div>
                  <div><label>Payment Terms</label><input value={lpoPaymentTerms} onChange={(e) => setLpoPaymentTerms(e.target.value)} placeholder="e.g. 30 days" /></div>
                </div>
                <div className="row">
                  <div><label>Delivery Date</label><input type="date" value={lpoDeliveryDate} onChange={(e) => setLpoDeliveryDate(e.target.value)} /></div>
                </div>
                <label>Notes</label>
                <textarea value={lpoNotes} onChange={(e) => setLpoNotes(e.target.value)} rows={2} />

                <label>Line Items</label>
                <table className="items-table">
                  <thead>
                    <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Rate</th><th>Amount</th><th></th></tr>
                  </thead>
                  <tbody>
                    {lpoItems.map((i, idx) => (
                      <tr key={idx}>
                        <td><input required value={i.description} onChange={(e) => updateLpoItem(idx, 'description', e.target.value)} /></td>
                        <td><input required type="number" step="0.01" value={i.qty} onChange={(e) => updateLpoItem(idx, 'qty', e.target.value)} /></td>
                        <td><input value={i.unit} onChange={(e) => updateLpoItem(idx, 'unit', e.target.value)} placeholder="pcs" /></td>
                        <td><input required type="number" step="0.01" value={i.unitRate} onChange={(e) => updateLpoItem(idx, 'unitRate', e.target.value)} /></td>
                        <td>{money((Number(i.qty) || 0) * (Number(i.unitRate) || 0))}</td>
                        <td>{lpoItems.length > 1 && <button type="button" className="btn small secondary" onClick={() => removeLpoItem(idx)}>x</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="btn small secondary" onClick={addLpoItem}>+ Add Item</button>

                <div className="totals">
                  <div className="totals-row"><span>Subtotal</span><span>{money(lpoSubtotal)}</span></div>
                  <div className="totals-row"><span>VAT (5%)</span><span>{money(lpoVat)}</span></div>
                  <div className="totals-row grand"><span>Total</span><span>{money(lpoTotal)}</span></div>
                </div>
                {lpoError && <div className="error-msg">{lpoError}</div>}
                <div className="actions-bar" style={{ marginTop: 10 }}>
                  <button className="btn" type="submit">Create LPO</button>
                  <button className="btn secondary" type="button" onClick={() => setShowLpoForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Statements of Account</h3>
        {soas.length > 0 ? (
          <table>
            <thead><tr><th>Number</th><th>Date</th><th>Balance</th><th></th></tr></thead>
            <tbody>
              {soas.map((s) => (
                <tr key={s.id}>
                  <td>{s.number}</td>
                  <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td>{money(s.totals?.balance ?? 0)}</td>
                  <td><Link to={`/statements-of-account/${s.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No statements generated yet for this project.</p>
        )}
        {canEditAccounts && (
          <div style={{ marginTop: 14 }}>
            <button className="btn small" type="button" onClick={generateSoa} disabled={generatingSoa || !project.customer}>
              {generatingSoa ? 'Generating...' : '+ Generate Statement of Account'}
            </button>
            {!project.customer && <p className="hint" style={{ marginTop: 6 }}>Assign a customer to this project first.</p>}
            {soaError && <div className="error-msg">{soaError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

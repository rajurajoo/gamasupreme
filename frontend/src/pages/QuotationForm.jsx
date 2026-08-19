import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useBusiness } from '../BusinessContext';
import { money } from '../format';

const emptyItem = { description: '', qty: 1, unit: '', unitPrice: 0, doorWidth: '', doorHeight: '', material: '', finish: '', workerCount: '', productId: '' };

export default function QuotationForm() {
  const { activeBusiness } = useBusiness();
  const code = activeBusiness?.code;
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [projectId, setProjectId] = useState('');
  const [jobType, setJobType] = useState('standard');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [attn, setAttn] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [subject, setSubject] = useState('');
  const [refBy, setRefBy] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (code === 'FO') api.get('/projects').then(setProjects);
    if (code === 'MT') api.get('/products').then(setProducts);
  }, [code]);

  function updateItem(idx, field, value) {
    const next = [...items];
    next[idx][field] = value;
    if (field === 'productId' && value) {
      const p = products.find((pr) => String(pr.id) === String(value));
      if (p) { next[idx].description = p.name; next[idx].unitPrice = p.unitCost; }
    }
    setItems(next);
  }
  function addItem() { setItems([...items, { ...emptyItem }]); }
  function removeItem(idx) { setItems(items.filter((_, i) => i !== idx)); }

  const subtotal = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  const discountAmount = subtotal * ((Number(discountPercent) || 0) / 100);
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * 0.05;
  const totalWithVat = afterDiscount + vatAmount;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const q = await api.post('/quotations', {
        customerName, customerEmail, customerPhone, jobType, notes, items, projectId: projectId || undefined, discountPercent,
        attn, projectLocation, subject, refBy, validUntil: validUntil || undefined, number: number || undefined,
      });
      navigate(`/quotations/${q.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>New Quotation {activeBusiness && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>({activeBusiness.name})</span>}</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div><label>Customer Name</label><input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Crunch Fitness" /></div>
            <div>
              <label>Job Type</label>
              <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="standard">standard</option>
                <option value="fitout">fitout (eligible for completion certificate)</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div><label>Customer Email</label><input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="optional" /></div>
            <div><label>Customer Phone</label><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="optional" /></div>
          </div>
          <div className="row">
            <div><label>Quotation Number</label><input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Leave blank to auto-generate" /></div>
          </div>

          {code === 'FO' && (
            <div>
              <label>Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">-- none --</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="row">
            <div><label>Attn (contact person)</label><input value={attn} onChange={(e) => setAttn(e.target.value)} placeholder="e.g. Mr. Jafar" /></div>
            <div><label>{code === 'MP' ? 'Site' : 'Project Location'}</label><input value={projectLocation} onChange={(e) => setProjectLocation(e.target.value)} placeholder="e.g. Dubai" /></div>
          </div>
          <div className="row">
            <div><label>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Quotation for Fitout Work" /></div>
            <div><label>Ref By</label><input value={refBy} onChange={(e) => setRefBy(e.target.value)} placeholder="e.g. GD" style={{ width: 100 }} /></div>
            <div><label>Valid Until</label><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
          </div>

          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

          <label>Line Items</label>
          <table className="items-table">
            <thead>
              <tr>
                {code === 'MT' && <th>Product</th>}
                <th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th>
                {code === 'DM' && <><th>Size (WxH cm)</th><th>Material</th><th>Finish</th></>}
                {code === 'MP' && <th>Head Count</th>}
                <th>Subtotal</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx}>
                  {code === 'MT' && (
                    <td>
                      <select value={i.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                        <option value="">-- custom --</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stockQty} in stock)</option>)}
                      </select>
                    </td>
                  )}
                  <td><input required value={i.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} /></td>
                  <td><input required type="number" step="0.01" value={i.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} /></td>
                  <td><input value={i.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} placeholder="LS/NOS/M2" style={{ width: 70 }} /></td>
                  <td><input required type="number" step="0.01" value={i.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} /></td>
                  {code === 'DM' && (
                    <>
                      <td style={{ display: 'flex', gap: 4 }}>
                        <input type="number" step="0.1" placeholder="W" value={i.doorWidth} onChange={(e) => updateItem(idx, 'doorWidth', e.target.value)} style={{ width: 55 }} />
                        <input type="number" step="0.1" placeholder="H" value={i.doorHeight} onChange={(e) => updateItem(idx, 'doorHeight', e.target.value)} style={{ width: 55 }} />
                      </td>
                      <td><input value={i.material} onChange={(e) => updateItem(idx, 'material', e.target.value)} placeholder="e.g. Solid Oak" /></td>
                      <td><input value={i.finish} onChange={(e) => updateItem(idx, 'finish', e.target.value)} placeholder="e.g. Matte White" /></td>
                    </>
                  )}
                  {code === 'MP' && (
                    <td><input type="number" step="1" min="0" value={i.workerCount} onChange={(e) => updateItem(idx, 'workerCount', e.target.value)} placeholder="e.g. 10" style={{ width: 70 }} /></td>
                  )}
                  <td>{money((Number(i.qty) || 0) * (Number(i.unitPrice) || 0))}</td>
                  <td>{items.length > 1 && <button type="button" className="btn small secondary" onClick={() => removeItem(idx)}>x</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn small secondary" onClick={addItem}>+ Add Item</button>

          <div>
            <label>Discount %</label>
            <input type="number" step="0.01" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} style={{ width: 100 }} />
          </div>

          <div className="totals">
            <div className="totals-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="totals-row"><span>Discount ({Number(discountPercent) || 0}%)</span><span>-{money(discountAmount)}</span></div>
            <div className="totals-row"><span>After Discount</span><span>{money(afterDiscount)}</span></div>
            <div className="totals-row"><span>VAT (5%)</span><span>{money(vatAmount)}</span></div>
            <div className="totals-row grand"><span>Total</span><span>{money(totalWithVat)}</span></div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Create Quotation</button>
        </form>
      </div>
    </div>
  );
}

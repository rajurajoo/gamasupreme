import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useBusiness } from '../BusinessContext';
import { money } from '../format';

const emptyItem = { description: '', qty: 1, unitPrice: 0, doorWidth: '', doorHeight: '', material: '', finish: '', productId: '' };

export default function QuotationForm() {
  const { activeBusiness } = useBusiness();
  const code = activeBusiness?.code;
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [jobType, setJobType] = useState('standard');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/customers').then((cs) => {
      setCustomers(cs);
      if (cs.length) setCustomerId(cs[0].id);
    });
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
      const q = await api.post('/quotations', { customerId, jobType, notes, items, projectId: projectId || undefined, discountPercent });
      navigate(`/quotations/${q.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>New Quotation {activeBusiness && <span style={{ fontSize: 14, color: '#6b7280' }}>({activeBusiness.name})</span>}</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div>
              <label>Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label>Job Type</label>
              <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
                <option value="standard">standard</option>
                <option value="fitout">fitout (eligible for completion certificate)</option>
              </select>
            </div>
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

          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

          <label>Line Items</label>
          <table className="items-table">
            <thead>
              <tr>
                {code === 'MT' && <th>Product</th>}
                <th>Description</th><th>Qty</th><th>Unit Price</th>
                {code === 'DM' && <><th>Size (WxH cm)</th><th>Material</th><th>Finish</th></>}
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
            Subtotal: {money(subtotal)} (AED) &nbsp;
            Discount ({Number(discountPercent) || 0}%): -{money(discountAmount)} (AED) &nbsp;
            After Discount: {money(afterDiscount)} (AED) &nbsp;
            VAT (5%): {money(vatAmount)} (AED) &nbsp;
            Total: <strong>{money(totalWithVat)} (AED)</strong>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Create Quotation</button>
        </form>
      </div>
    </div>
  );
}

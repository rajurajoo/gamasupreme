import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useBusiness } from '../BusinessContext';
import { money } from '../format';

const emptyItem = { description: '', qty: 1, unitPrice: 0, doorWidth: '', doorHeight: '', material: '', finish: '', workerCount: '', productId: '' };

export default function InvoiceForm() {
  const { activeBusiness } = useBusiness();
  const code = activeBusiness?.code;
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [projectId, setProjectId] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [subject, setSubject] = useState('TAX INVOICE');
  const [modeOfPayment, setModeOfPayment] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [deductions, setDeductions] = useState('');
  const [site, setSite] = useState('');
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

  const deductionLines = deductions.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [label, pctStr] = l.split('|').map((s) => (s || '').trim());
    const percent = Number(pctStr) || 0;
    return { label, percent, amount: afterDiscount * (percent / 100) };
  });
  const deductionsTotal = deductionLines.reduce((sum, d) => sum + d.amount, 0);
  const afterDeductions = afterDiscount - deductionsTotal;
  const vatAmount = afterDeductions * 0.05;
  const totalWithVat = afterDeductions + vatAmount;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const inv = await api.post('/invoices', {
        customerName, customerEmail, customerPhone, items, projectId: projectId || undefined, discountPercent,
        dueDate, subject, modeOfPayment, validUntil: validUntil || undefined, deductions, site, number: number || undefined,
      });
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>New Invoice {activeBusiness && <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>({activeBusiness.name})</span>}</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div><label>Customer Name</label><input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Metaline L.L.C" /></div>
            <div><label>Due Date</label><input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Customer Email</label><input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="optional" /></div>
            <div><label>Customer Phone</label><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="optional" /></div>
          </div>
          <div className="row">
            <div><label>Invoice Number</label><input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Leave blank to auto-generate" /></div>
            <div><label>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Mode of Payment</label><input value={modeOfPayment} onChange={(e) => setModeOfPayment(e.target.value)} placeholder="e.g. 30 DAYS PDC" /></div>
            <div><label>Valid Until</label><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
          </div>
          {code === 'MP' && (
            <div className="row">
              <div><label>Site</label><input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. Al Qusais Warehouse" /></div>
            </div>
          )}

          {code === 'FO' && (
            <div>
              <label>Project</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">-- none --</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <label>Line Items</label>
          <table className="items-table">
            <thead>
              <tr>
                {code === 'MT' && <th>Product</th>}
                <th>Description</th><th>Qty</th><th>Unit Price</th>
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

          <label>Deductions (one per line, Label|Percent)</label>
          <textarea rows={3} style={{ width: '100%' }} value={deductions} onChange={(e) => setDeductions(e.target.value)} placeholder={'Less Advance|30\nLess Completion|10'} />

          <div className="totals">
            <div className="totals-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="totals-row"><span>Discount ({Number(discountPercent) || 0}%)</span><span>-{money(discountAmount)}</span></div>
            {deductionLines.map((d, idx) => (
              <div className="totals-row" key={idx}><span>{d.label} ({d.percent}%)</span><span>-{money(d.amount)}</span></div>
            ))}
            <div className="totals-row"><span>After Deductions</span><span>{money(afterDeductions)}</span></div>
            <div className="totals-row"><span>VAT (5%)</span><span>{money(vatAmount)}</span></div>
            <div className="totals-row grand"><span>Total</span><span>{money(totalWithVat)}</span></div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Create Invoice</button>
        </form>
      </div>
    </div>
  );
}

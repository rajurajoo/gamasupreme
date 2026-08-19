import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';
import { useBusiness } from '../BusinessContext';
import { downloadQuotationTemplate, parseQuotationExcel } from '../xlsxQuotation';

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState('');
  const [parsed, setParsed] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef(null);
  const { businessId } = useBusiness();
  const navigate = useNavigate();

  useEffect(() => { if (businessId) api.get('/quotations').then(setQuotations); }, [businessId]);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError('');
    setParsed(null);
    try {
      const result = await parseQuotationExcel(file);
      setParsed(result);
    } catch (err) {
      setUploadError(err.message);
    }
    e.target.value = '';
  }

  async function confirmCreate() {
    setUploadError('');
    setCreating(true);
    try {
      const customers = await api.get('/customers');
      let customer = customers.find((c) => c.name.trim().toLowerCase() === parsed.customerName.trim().toLowerCase());
      if (!customer) {
        customer = await api.post('/customers', {
          name: parsed.customerName,
          email: parsed.customerEmail || undefined,
          phone: parsed.customerPhone || undefined,
        });
      }
      const q = await api.post('/quotations', {
        customerId: customer.id,
        jobType: 'standard',
        notes: parsed.notes || undefined,
        items: parsed.items,
      });
      setParsed(null);
      navigate(`/quotations/${q.id}`);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1>Quotations</h1>
      <div className="actions-bar">
        <Link className="btn" to="/quotations/new">+ New Quotation</Link>
        <button className="btn secondary" type="button" onClick={downloadQuotationTemplate}>Download Excel Template</button>
        <button className="btn secondary" type="button" onClick={() => fileInputRef.current.click()}>Upload Quotation Excel</button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {uploadError && <div className="error-msg">{uploadError}</div>}

      {parsed && (
        <div className="card">
          <h3>Captured from Excel — Review Before Creating</h3>
          <p><strong>Customer:</strong> {parsed.customerName}</p>
          {parsed.customerEmail && <p><strong>Email:</strong> {parsed.customerEmail}</p>}
          {parsed.customerPhone && <p><strong>Phone:</strong> {parsed.customerPhone}</p>}
          {parsed.notes && <p><strong>Notes:</strong> {parsed.notes}</p>}
          <table style={{ marginTop: 10 }}>
            <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
            <tbody>
              {parsed.items.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.description}</td>
                  <td>{i.qty}</td>
                  <td>{money(i.unitPrice)}</td>
                  <td>{money(i.qty * i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="actions-bar" style={{ marginTop: 14 }}>
            <button className="btn" onClick={confirmCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Quotation'}</button>
            <button className="btn secondary" onClick={() => setParsed(null)} disabled={creating}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quotation number..."
          style={{ marginBottom: 14, maxWidth: 320 }}
        />
        <table>
          <thead><tr><th>Number</th><th>Customer</th><th>Job Type</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {quotations
              .filter((q) => q.number.toLowerCase().includes(search.trim().toLowerCase()))
              .map((q) => (
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

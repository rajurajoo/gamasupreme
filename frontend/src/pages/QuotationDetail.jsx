import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money } from '../format';

const STAGES = ['Measurement', 'Production', 'QC', 'Delivery'];

export default function QuotationDetail() {
  const { id } = useParams();
  const [q, setQ] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [percent, setPercent] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff';

  function load() {
    api.get(`/quotations/${id}`).then((data) => {
      setQ(data);
      setPercent((prev) => (prev === '' ? String(data.remainingPercent) : prev));
    });
  }
  useEffect(load, [id]);

  async function setStatus(status) {
    setError('');
    try { await api.put(`/quotations/${id}`, { status }); load(); }
    catch (err) { setError(err.message); }
  }

  async function setStage(jobStage) {
    setError('');
    try { await api.put(`/quotations/${id}`, { jobStage }); load(); }
    catch (err) { setError(err.message); }
  }

  async function convertToInvoice(e) {
    e.preventDefault();
    setError('');
    const pct = Number(percent);
    if (!percent || Number.isNaN(pct) || pct < 1 || pct > q.remainingPercent) {
      setError(`Percent must be between 1 and ${q.remainingPercent}`);
      return;
    }
    try {
      const inv = await api.post(`/invoices/from-quotation/${id}`, { dueDate, percent: pct });
      navigate(`/invoices/${inv.id}`);
    } catch (err) { setError(err.message); }
  }

  if (!q) return <div>Loading...</div>;
  const isDoorMfg = q.business?.code === 'DM';

  return (
    <div className="print-view">
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 6px' }}>GAMA SUPREME - {q.business?.name}</p>
      <h1>Quotation {q.number} <span className={`badge ${q.status}`}>{q.status}</span></h1>
      <div className="card">
        <p><strong>Customer:</strong> {q.customer.name}<br />
          {q.customer.email} {q.customer.phone}<br />{q.customer.address}</p>
        <p><strong>Job Type:</strong> {q.jobType}</p>
        {q.project && <p><strong>Project:</strong> {q.project.name}</p>}
        {q.notes && <p><strong>Notes:</strong> {q.notes}</p>}
        <table>
          <thead>
            <tr>
              <th>Description</th><th>Qty</th><th>Unit Price</th>
              {isDoorMfg && <><th>Size</th><th>Material</th><th>Finish</th></>}
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((i) => (
              <tr key={i.id}>
                <td>{i.description}</td><td>{i.qty}</td><td>{money(i.unitPrice)}</td>
                {isDoorMfg && (
                  <>
                    <td>{i.doorWidth && i.doorHeight ? `${i.doorWidth} x ${i.doorHeight} cm` : '-'}</td>
                    <td>{i.material || '-'}</td>
                    <td>{i.finish || '-'}</td>
                  </>
                )}
                <td>{money(i.qty * i.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totals">
          Subtotal: {money(q.subtotal)} (AED) &nbsp;
          Discount ({q.discountPercent}%): -{money(q.discountAmount)} (AED) &nbsp;
          After Discount: {money(q.afterDiscount)} (AED) &nbsp;
          VAT ({q.vatRate}%): {money(q.vatAmount)} (AED) &nbsp;
          Total: <strong>{money(q.totalWithVat)} (AED)</strong>
        </div>
      </div>

      {isDoorMfg && (
        <div className="card no-print">
          <h3>Job Stage</h3>
          <div className="actions-bar">
            {STAGES.map((s) => (
              <button
                key={s}
                className={`btn small ${q.jobStage === s ? '' : 'secondary'}`}
                onClick={() => canEdit && setStage(s)}
                disabled={!canEdit}
              >
                {s}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Current stage: <strong>{q.jobStage || 'Measurement'}</strong></p>
        </div>
      )}

      {canEdit && (
        <div className="card no-print">
          <h3>Actions</h3>
          {error && <div className="error-msg">{error}</div>}
          <div className="actions-bar">
            {q.status === 'draft' && <button className="btn" onClick={() => setStatus('sent')}>Mark as Sent</button>}
            {(q.status === 'draft' || q.status === 'sent') && <>
              <button className="btn" onClick={() => setStatus('accepted')}>Mark as Accepted</button>
              <button className="btn secondary" onClick={() => setStatus('rejected')}>Mark as Rejected</button>
            </>}
            <button className="btn secondary" onClick={() => window.print()}>Print / Export View</button>
          </div>

          {q.status === 'accepted' && (
            <div style={{ marginTop: 16 }}>
              <h3>Milestone Invoicing</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 6px' }}>
                Invoiced: {q.invoicedPercent}% &middot; Remaining: {q.remainingPercent}%
              </p>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${q.invoicedPercent}%` }} />
              </div>

              {q.invoices && q.invoices.length > 0 && (
                <table style={{ marginTop: 14 }}>
                  <thead>
                    <tr><th>Invoice</th><th>%</th><th>Total</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {q.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td><a href={`/invoices/${inv.id}`} onClick={(e) => { e.preventDefault(); navigate(`/invoices/${inv.id}`); }}>{inv.number}</a></td>
                        <td>{inv.percentOfQuotation != null ? `${inv.percentOfQuotation}%` : '100% (legacy)'}</td>
                        <td>{money(inv.totalWithVat)}</td>
                        <td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {q.remainingPercent > 0 ? (
                <form onSubmit={convertToInvoice} style={{ marginTop: 14 }}>
                  <div className="row">
                    <div>
                      <label>Percent to Invoice</label>
                      <input required type="number" min="1" max={q.remainingPercent} value={percent} onChange={(e) => setPercent(e.target.value)} />
                    </div>
                    <div>
                      <label>Due Date</label>
                      <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>
                  <button className="btn" style={{ marginTop: 10 }} type="submit">Create Invoice</button>
                </form>
              ) : (
                <p style={{ color: 'var(--status-green-fg)', fontWeight: 600, marginTop: 10 }}>Fully invoiced</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

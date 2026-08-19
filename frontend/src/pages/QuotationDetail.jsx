import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money, amountInWords } from '../format';
import logoFull from '../assets/logo-horizontal.png';

const STAGES = ['Measurement', 'Production', 'QC', 'Delivery'];

export default function QuotationDetail() {
  const { id } = useParams();
  const [q, setQ] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [percent, setPercent] = useState('');
  const [error, setError] = useState('');
  const [jobOrders, setJobOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignedToId, setAssignedToId] = useState('');
  const [joDueDate, setJoDueDate] = useState('');
  const [joNotes, setJoNotes] = useState('');
  const [joError, setJoError] = useState('');
  const [terms, setTerms] = useState('');
  const [termsSaved, setTermsSaved] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff';

  function load() {
    api.get(`/quotations/${id}`).then((data) => {
      setQ(data);
      setPercent((prev) => (prev === '' ? String(data.remainingPercent) : prev));
      setTerms((prev) => (prev === '' ? (data.termsAndConditions || '') : prev));
      setDetails((prev) => prev || {
        number: data.number || '',
        attn: data.attn || '',
        projectLocation: data.projectLocation || '',
        subject: data.subject || 'QUOTATION FOR FITOUT WORK',
        refBy: data.refBy || '',
        validUntil: data.validUntil ? data.validUntil.slice(0, 10) : '',
        exclusions: data.exclusions || '',
        paymentTerms: data.paymentTerms || '',
        durationOfWork: data.durationOfWork || '',
      });
    });
    api.get(`/job-orders?quotationId=${id}`).then(setJobOrders);
    api.get('/employees').then((es) => setEmployees(es.filter((e) => e.active)));
  }
  useEffect(load, [id]);

  async function saveDetails(e) {
    e.preventDefault();
    setError('');
    setDetailsSaved(false);
    try {
      await api.put(`/quotations/${id}`, { ...details, validUntil: details.validUntil || null });
      setDetailsSaved(true);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createJobOrder(e) {
    e.preventDefault();
    setJoError('');
    try {
      await api.post(`/job-orders/from-quotation/${id}`, { assignedToId: assignedToId || null, dueDate: joDueDate || null, notes: joNotes });
      setJoDueDate('');
      setJoNotes('');
      load();
    } catch (err) {
      setJoError(err.message);
    }
  }

  async function setStatus(status) {
    setError('');
    try { await api.put(`/quotations/${id}`, { status }); load(); }
    catch (err) { setError(err.message); }
  }

  async function reviseQuotation() {
    setError('');
    try {
      const revised = await api.post(`/quotations/${id}/revise`, {});
      navigate(`/quotations/${revised.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStage(jobStage) {
    setError('');
    try { await api.put(`/quotations/${id}`, { jobStage }); load(); }
    catch (err) { setError(err.message); }
  }

  async function toggleWatermark() {
    setError('');
    try { await api.put(`/quotations/${id}`, { showWatermark: !q.showWatermark }); load(); }
    catch (err) { setError(err.message); }
  }

  async function saveTerms(e) {
    e.preventDefault();
    setError('');
    setTermsSaved(false);
    try {
      await api.put(`/quotations/${id}`, { termsAndConditions: terms });
      setTermsSaved(true);
    } catch (err) {
      setError(err.message);
    }
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

  if (!q || !details) return <div>Loading...</div>;
  const isDoorMfg = q.business?.code === 'DM';
  const isManpower = q.business?.code === 'MP';
  const biz = q.business || {};
  const exclusionLines = (q.exclusions || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const paymentTermLines = (q.paymentTerms || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const termsLines = (q.termsAndConditions || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const hasBankDetails = biz.bankName || biz.bankAccountNumber || biz.bankIban;

  return (
    <div className="print-view">
      <h1 className="no-print">Quotation {q.number} <span className={`badge ${q.status}`}>{q.status}</span></h1>
      {(q.revisionOf || (q.revisions && q.revisions.length > 0)) && (
        <p className="hint no-print" style={{ margin: '0 0 10px' }}>
          {q.revisionOf && <>Revision {q.revisionNumber} of <a href={`/quotations/${q.revisionOf.id}`} onClick={(e) => { e.preventDefault(); navigate(`/quotations/${q.revisionOf.id}`); }}>{q.revisionOf.number}</a>. </>}
          {q.revisions && q.revisions.length > 0 && (
            <>Revisions: {q.revisions.map((r, idx) => (
              <span key={r.id}>
                {idx > 0 && ', '}
                <a href={`/quotations/${r.id}`} onClick={(e) => { e.preventDefault(); navigate(`/quotations/${r.id}`); }}>{r.number}</a>
              </span>
            ))}</>
          )}
        </p>
      )}

      <div className="card qt-doc qt-page">
        {q.showWatermark && (
          <div className="watermark-overlay"><span className="watermark-text">GAMA SUPREME</span></div>
        )}
        {/* Letterhead */}
        <div className="qt-letterhead">
          <div className="qt-letterhead-left">
            <img className="qt-full-logo" src={logoFull} alt="Gama Supreme Technical Services" />
          </div>
          <div className="qt-letterhead-right">
            {biz.email && <div>Email : {biz.email}</div>}
            {biz.website && <div>Web : {biz.website}</div>}
            {biz.phone && <div>Phone : {biz.phone}</div>}
          </div>
        </div>

        {/* Info grid */}
        <div className="qt-info-grid">
          <div className="qt-info-left">
            <div className="qt-info-left-row"><strong>CUSTOMER NAME:-</strong> {q.customer.name}</div>
            <div className="qt-info-left-row"><strong>ATTN:-</strong> {q.attn || '-'}</div>
            <div className="qt-info-left-row"><strong>{isManpower ? 'SITE:-' : 'PROJECT LOCATION:-'}</strong> {q.projectLocation || '-'}</div>
            <div className="qt-info-left-row"><strong>SUBJECT:-</strong> {q.subject || '-'}</div>
          </div>
          <div className="qt-info-right">
            <div className="qt-info-cell"><span className="qt-info-cell-label">Ref:No</span>{q.number}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Date</span>{new Date(q.createdAt).toLocaleDateString()}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Ref:By</span>{q.refBy || '-'}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Valid Until</span>{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '-'}</div>
          </div>
        </div>

        <div className="qt-section-banner">SCOPE OF WORK</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="qt-items-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>SL:NO</th>
                <th>DESCRIPTION</th>
                <th style={{ width: 60 }}>QTY</th>
                <th style={{ width: 60 }}>UNIT</th>
                {isDoorMfg && <><th>Size</th><th>Material</th><th>Finish</th></>}
                {isManpower && <th style={{ width: 80 }}>HEAD COUNT</th>}
                <th style={{ width: 90 }}>RATE</th>
                <th style={{ width: 100 }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((i, idx) => (
                <tr key={i.id}>
                  <td className="qt-num">{idx + 1}</td>
                  <td className="qt-desc">{i.description}</td>
                  <td className="qt-num">{i.qty}</td>
                  <td className="qt-num">{i.unit || '-'}</td>
                  {isDoorMfg && (
                    <>
                      <td>{i.doorWidth && i.doorHeight ? `${i.doorWidth} x ${i.doorHeight} cm` : '-'}</td>
                      <td>{i.material || '-'}</td>
                      <td>{i.finish || '-'}</td>
                    </>
                  )}
                  {isManpower && <td className="qt-num">{i.workerCount || '-'}</td>}
                  <td className="qt-amt">{money(i.unitPrice)}</td>
                  <td className="qt-amt">{money(i.qty * i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <table className="qt-totals-table">
          <tbody>
            {q.discountPercent > 0 && (
              <>
                <tr><td className="qt-totals-label">SUBTOTAL</td><td className="qt-totals-value">{money(q.subtotal)}</td></tr>
                <tr><td className="qt-totals-label">DISCOUNT ({q.discountPercent}%)</td><td className="qt-totals-value">-{money(q.discountAmount)}</td></tr>
              </>
            )}
            <tr><td className="qt-totals-label">TOTAL</td><td className="qt-totals-value">{money(q.afterDiscount)}</td></tr>
            <tr><td className="qt-totals-label">VAT({q.vatRate}%)</td><td className="qt-totals-value">{money(q.vatAmount)}</td></tr>
            <tr className="qt-grand-row"><td className="qt-totals-label">GRAND TOTAL</td><td className="qt-totals-value">{money(q.totalWithVat)}</td></tr>
          </tbody>
        </table>
        <div className="qt-amount-words">{amountInWords(q.totalWithVat)}</div>
      </div>

      <div className="card qt-doc qt-page">
        {q.showWatermark && (
          <div className="watermark-overlay"><span className="watermark-text">GAMA SUPREME</span></div>
        )}
        {exclusionLines.length > 0 && (
          <div className="qt-footer-box">
            <h4>Exclusions</h4>
            <ul>{exclusionLines.map((l, idx) => <li key={idx}>{l}</li>)}</ul>
          </div>
        )}

        {q.durationOfWork && (
          <div className="qt-footer-box">
            <h4>Duration of Work</h4>
            <p style={{ margin: 0, fontSize: 12.5 }}>{q.durationOfWork}</p>
          </div>
        )}

        {paymentTermLines.length > 0 && (
          <div className="qt-footer-box">
            <h4>Payment Terms</h4>
            <ul>{paymentTermLines.map((l, idx) => <li key={idx}>{l}</li>)}</ul>
          </div>
        )}

        {hasBankDetails && (
          <div className="qt-bank-box">
            <strong>ACCOUNT DETAILS :</strong><br />
            {biz.bankName && <>BANK NAME: {biz.bankName}<br /></>}
            {biz.bankAccountTitle && <>Account Title: {biz.bankAccountTitle}<br /></>}
            {biz.bankCifNumber && <>CIF Number : {biz.bankCifNumber}<br /></>}
            {biz.bankAccountNumber && <>Account Number: {biz.bankAccountNumber}<br /></>}
            {biz.bankIban && <>IBAN : {biz.bankIban}</>}
          </div>
        )}

        <div className="qt-closing-box">
          We hope the above rates are competitive and looking forward to receiving your valuable reply.
          For further clarification, please don&rsquo;t hesitate to contact us. We would be very pleased to do
          business with your esteemed organization.
        </div>

        {termsLines.length > 0 && (
          <div className="qt-footer-box">
            <h4>Terms &amp; Conditions</h4>
            <ul>{termsLines.map((l, idx) => <li key={idx}>{l}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="card qt-doc qt-page">
        {q.showWatermark && (
          <div className="watermark-overlay"><span className="watermark-text">GAMA SUPREME</span></div>
        )}
        <div className="qt-confirm-grid">
          <div className="qt-confirm-col">
            <h4>Company Confirmation</h4>
            <p className="qt-confirm-intro">We acknowledge the acceptance of this quotation and confirm that the work will be carried out as per the agreed terms.</p>
            <div className="qt-confirm-line"><strong>Authorized Representative</strong><span>{biz.authorizedRepName || '-'}</span></div>
            <div className="qt-confirm-line"><strong>Designation</strong><span>{biz.authorizedRepDesignation || '-'}</span></div>
            <div className="qt-confirm-line"><strong>Contact</strong><span>{biz.authorizedRepContact || '-'}</span></div>
            <div className="qt-sig-box">Signature &amp; Stamp</div>
          </div>
          <div className="qt-confirm-col">
            <h4>Customer Confirmation</h4>
            <p className="qt-confirm-intro">We hereby confirm our acceptance of the above quotation, including the scope of work, pricing, and terms and conditions stated.</p>
            <div className="qt-confirm-line"><strong>Client Name</strong><span>&nbsp;</span></div>
            <div className="qt-confirm-line"><strong>Company Name</strong><span>&nbsp;</span></div>
            <div className="qt-confirm-line"><strong>Designation</strong><span>&nbsp;</span></div>
            <div className="qt-sig-box">Authorized Signature</div>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="card no-print">
          <h3>Quotation Details</h3>
          <form onSubmit={saveDetails}>
            <div className="row">
              <div><label>Quotation Number</label><input value={details.number} onChange={(e) => setDetails({ ...details, number: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Attn</label><input value={details.attn} onChange={(e) => setDetails({ ...details, attn: e.target.value })} placeholder="e.g. Mr. Jafar" /></div>
              <div><label>{isManpower ? 'Site' : 'Project Location'}</label><input value={details.projectLocation} onChange={(e) => setDetails({ ...details, projectLocation: e.target.value })} placeholder="e.g. Dubai" /></div>
            </div>
            <div className="row">
              <div><label>Subject</label><input value={details.subject} onChange={(e) => setDetails({ ...details, subject: e.target.value })} /></div>
              <div><label>Ref By</label><input value={details.refBy} onChange={(e) => setDetails({ ...details, refBy: e.target.value })} style={{ width: 100 }} /></div>
              <div><label>Valid Until</label><input type="date" value={details.validUntil} onChange={(e) => setDetails({ ...details, validUntil: e.target.value })} /></div>
            </div>
            <label>Exclusions (one per line)</label>
            <textarea rows={4} style={{ width: '100%' }} value={details.exclusions} onChange={(e) => setDetails({ ...details, exclusions: e.target.value })} placeholder={'NOC from concerned authority, Gate pass\nLoose furniture\nElectrical & Plumbing material'} />
            <label>Duration of Work</label>
            <input value={details.durationOfWork} onChange={(e) => setDetails({ ...details, durationOfWork: e.target.value })} placeholder="e.g. 60 Days after receiving the advance" />
            <label>Payment Terms (one per line)</label>
            <textarea rows={3} style={{ width: '100%' }} value={details.paymentTerms} onChange={(e) => setDetails({ ...details, paymentTerms: e.target.value })} placeholder={'60% Advance payment\n30% Progressive payment\n10% After Completion of work'} />
            {detailsSaved && <span className="hint" style={{ color: 'var(--status-green-fg)' }}>Saved</span>}
            <button className="btn secondary" style={{ marginTop: 10, display: 'block' }} type="submit">Save Details</button>
          </form>

          <h3 style={{ marginTop: 24 }}>Terms &amp; Conditions</h3>
          <form onSubmit={saveTerms}>
            <textarea
              rows={5}
              style={{ width: '100%' }}
              value={terms}
              onChange={(e) => { setTerms(e.target.value); setTermsSaved(false); }}
              placeholder={'Retention excluded.\nThis proposal will be valid for 7 days.\nOwnership of the products shall remain with GAMA until full payment is received.'}
            />
            <button className="btn secondary" style={{ marginTop: 10 }} type="submit">Save Terms</button>
            {termsSaved && <span className="hint" style={{ marginLeft: 10, color: 'var(--status-green-fg)' }}>Saved</span>}
          </form>
        </div>
      )}

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
            <button className="btn secondary" onClick={reviseQuotation}>Create Revision</button>
            <button className="btn secondary" onClick={toggleWatermark}>Watermark: {q.showWatermark ? 'ON' : 'OFF'}</button>
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

          {q.status === 'accepted' && (
            <div style={{ marginTop: 24 }}>
              <h3>Job Orders</h3>
              {jobOrders.length > 0 && (
                <table style={{ marginTop: 8 }}>
                  <thead><tr><th>Number</th><th>Assigned To</th><th>Status</th></tr></thead>
                  <tbody>
                    {jobOrders.map((jo) => (
                      <tr key={jo.id}>
                        <td><a href={`/job-orders/${jo.id}`} onClick={(e) => { e.preventDefault(); navigate(`/job-orders/${jo.id}`); }}>{jo.number}</a></td>
                        <td>{jo.assignedTo?.name || '-'}</td>
                        <td><span className="badge">{jo.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <form onSubmit={createJobOrder} style={{ marginTop: 14 }}>
                <div className="row">
                  <div>
                    <label>Assign To</label>
                    <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
                      <option value="">-- unassigned --</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Due Date</label>
                    <input type="date" value={joDueDate} onChange={(e) => setJoDueDate(e.target.value)} />
                  </div>
                </div>
                <label>Notes</label>
                <input value={joNotes} onChange={(e) => setJoNotes(e.target.value)} placeholder="Optional" />
                {joError && <div className="error-msg">{joError}</div>}
                <button className="btn secondary" style={{ marginTop: 10 }} type="submit">Create Job Order</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

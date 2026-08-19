import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money, amountInWords } from '../format';
import logoFull from '../assets/logo-horizontal.png';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const [error, setError] = useState('');
  const [terms, setTerms] = useState('');
  const [termsSaved, setTermsSaved] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEditDocs = user.role === 'admin' || user.role === 'sales_staff';
  const canRecordPayment = user.role === 'admin' || user.role === 'sales_staff' || user.role === 'accountant';

  function load() {
    api.get(`/invoices/${id}`).then((i) => {
      setInv(i);
      setAmountPaid(i.amountPaid);
      setTerms((prev) => (prev === '' ? (i.termsAndConditions || '') : prev));
      setDetails((prev) => prev || {
        number: i.number || '',
        subject: i.subject || 'TAX INVOICE',
        modeOfPayment: i.modeOfPayment || '',
        validUntil: i.validUntil ? i.validUntil.slice(0, 10) : '',
        deductions: i.deductions || '',
        site: i.site || '',
      });
    });
  }
  useEffect(load, [id]);

  async function saveDetails(e) {
    e.preventDefault();
    setError('');
    setDetailsSaved(false);
    try {
      await api.put(`/invoices/${id}`, { ...details, validUntil: details.validUntil || null });
      setDetailsSaved(true);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveTerms(e) {
    e.preventDefault();
    setError('');
    setTermsSaved(false);
    try {
      await api.put(`/invoices/${id}`, { termsAndConditions: terms });
      setTermsSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function recordPayment(e) {
    e.preventDefault();
    setError('');
    const total = inv.totalWithVat;
    const paid = Number(amountPaid);
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    try { await api.put(`/invoices/${id}`, { amountPaid: paid, status }); load(); }
    catch (err) { setError(err.message); }
  }

  async function convertToDO(e) {
    e.preventDefault();
    setError('');
    try {
      const doc = await api.post(`/delivery-orders/from-invoice/${id}`, { deliveryDate, signedBy });
      navigate(`/delivery-orders/${doc.id}`);
    } catch (err) { setError(err.message); }
  }

  if (!inv || !details) return <div>Loading...</div>;
  const customer = inv.customer || inv.quotation?.customer;
  const isDoorMfg = inv.business?.code === 'DM';
  const isManpower = inv.business?.code === 'MP';
  const biz = inv.business || {};
  const hasBankDetails = biz.bankName || biz.bankAccountNumber || biz.bankIban;

  return (
    <div className="print-view">
      <h1 className="no-print">Invoice {inv.number} <span className={`badge ${inv.status}`}>{inv.status}</span></h1>
      {inv.percentOfQuotation != null && inv.quotation && (
        <p className="hint no-print" style={{ margin: '0 0 12px' }}>
          Progress billing: {inv.percentOfQuotation}% of quotation {inv.quotation.number}
        </p>
      )}

      <div className="card qt-doc qt-page">
        {inv.showWatermark && (
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
            {biz.trn && <div>TRN NO: {biz.trn}</div>}
          </div>
        </div>

        {/* Info grid */}
        <div className="qt-info-grid">
          <div className="qt-info-left">
            <div className="qt-info-left-row"><strong>CUSTOMER NAME:</strong> {customer.name}</div>
            {customer.trn && <div className="qt-info-left-row"><strong>CUSTOMER TRN NO:</strong> {customer.trn}</div>}
            {inv.quotation && <div className="qt-info-left-row"><strong>QTN/LPO REF NO:</strong> {inv.quotation.number}</div>}
            {isManpower && <div className="qt-info-left-row"><strong>SITE:-</strong> {inv.site || '-'}</div>}
            <div className="qt-info-left-row"><strong>SUBJECT:-</strong> {inv.subject || 'TAX INVOICE'}</div>
          </div>
          <div className="qt-info-right">
            <div className="qt-info-cell"><span className="qt-info-cell-label">Invoice :No</span>{inv.number}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Date</span>{new Date(inv.createdAt).toLocaleDateString()}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Mode of Payment</span>{inv.modeOfPayment || '-'}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Valid Until</span>{inv.validUntil ? new Date(inv.validUntil).toLocaleDateString() : new Date(inv.dueDate).toLocaleDateString()}</div>
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
              {inv.items.map((i, idx) => (
                <tr key={i.id}>
                  <td className="qt-num">{idx + 1}</td>
                  <td className="qt-desc">{i.description}</td>
                  <td className="qt-num">{i.qty}</td>
                  <td className="qt-num">-</td>
                  {isDoorMfg && (
                    <>
                      <td>{i.doorWidth && i.doorHeight ? `${i.doorWidth} x ${i.doorHeight} cm` : '-'}</td>
                      <td>{i.material || '-'}</td>
                      <td>{i.finish || '-'}</td>
                    </>
                  )}
                  <td className="qt-amt">{money(i.unitPrice)}</td>
                  <td className="qt-amt">{money(i.qty * i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <table className="qt-totals-table">
          <tbody>
            <tr><td className="qt-totals-label">TOTAL AMOUNT</td><td className="qt-totals-value">{money(inv.total)}</td></tr>
            {inv.deductionLines && inv.deductionLines.map((d, idx) => (
              <tr key={idx}><td className="qt-totals-label">{d.label} ({d.percent}%)</td><td className="qt-totals-value">-{money(d.amount)}</td></tr>
            ))}
            <tr><td className="qt-totals-label">TOTAL</td><td className="qt-totals-value">{money(inv.afterDeductions)}</td></tr>
            <tr><td className="qt-totals-label">VAT ({inv.vatRate}%)</td><td className="qt-totals-value">{money(inv.vatAmount)}</td></tr>
            <tr className="qt-grand-row"><td className="qt-totals-label">GRAND TOTAL</td><td className="qt-totals-value">{money(inv.totalWithVat)}</td></tr>
          </tbody>
        </table>
        <div className="qt-amount-words">{amountInWords(inv.totalWithVat)}</div>

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

        <div className="qt-closing-box" style={{ fontWeight: 500, background: 'transparent', border: '1px solid #e5e7eb' }}>
          Any discrepancy pls. notify us within 3 days from the receipt of this invoice. Contents of the invoice
          true and correct. All payment should be made to GAMA SUPREME TECHNICAL SERVICES.
        </div>

        {inv.termsAndConditions && (
          <div className="qt-footer-box">
            <h4>Terms &amp; Conditions</h4>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12.5, color: '#374151' }}>{inv.termsAndConditions}</p>
          </div>
        )}
      </div>

      {canEditDocs && (
        <div className="card no-print">
          <h3>Invoice Details</h3>
          <form onSubmit={saveDetails}>
            <div className="row">
              <div><label>Invoice Number</label><input value={details.number} onChange={(e) => setDetails({ ...details, number: e.target.value })} /></div>
              <div><label>Subject</label><input value={details.subject} onChange={(e) => setDetails({ ...details, subject: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Mode of Payment</label><input value={details.modeOfPayment} onChange={(e) => setDetails({ ...details, modeOfPayment: e.target.value })} placeholder="e.g. 30 DAYS PDC" /></div>
              <div><label>Valid Until</label><input type="date" value={details.validUntil} onChange={(e) => setDetails({ ...details, validUntil: e.target.value })} /></div>
            </div>
            <label>Deductions (one per line, Label|Percent)</label>
            <textarea rows={3} style={{ width: '100%' }} value={details.deductions} onChange={(e) => setDetails({ ...details, deductions: e.target.value })} placeholder={'Less Advance|30\nLess Completion|10'} />
            {detailsSaved && <span className="hint" style={{ color: 'var(--status-green-fg)' }}>Saved</span>}
            <button className="btn secondary" style={{ marginTop: 10, display: 'block' }} type="submit">Save Details</button>
          </form>
        </div>
      )}

      {(canRecordPayment || canEditDocs) && (
        <div className="card no-print">
          <h3>Actions</h3>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn secondary" onClick={() => window.print()}>Print / Export View</button>
          <button className="btn secondary" onClick={async () => { setError(''); try { await api.put(`/invoices/${id}`, { showWatermark: !inv.showWatermark }); load(); } catch (err) { setError(err.message); } }}>Watermark: {inv.showWatermark ? 'ON' : 'OFF'}</button>

          {canEditDocs && (
            <form onSubmit={saveTerms} style={{ marginTop: 20 }}>
              <h3>Terms &amp; Conditions</h3>
              <textarea
                rows={5}
                style={{ width: '100%' }}
                value={terms}
                onChange={(e) => { setTerms(e.target.value); setTermsSaved(false); }}
                placeholder="e.g. Payment due within 30 days."
              />
              <button className="btn secondary" style={{ marginTop: 10 }} type="submit">Save Terms</button>
              {termsSaved && <span className="hint" style={{ marginLeft: 10, color: 'var(--status-green-fg)' }}>Saved</span>}
            </form>
          )}

          {canRecordPayment && (
            <form onSubmit={recordPayment} style={{ marginTop: 14 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 8px' }}>
                Grand Total: {money(inv.totalWithVat)} &middot; Paid: {money(inv.amountPaid)} &middot; Balance: {money(inv.balance)}
              </p>
              <label>Amount Paid</label>
              <input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
              <button className="btn" style={{ marginTop: 10 }} type="submit">Update Payment</button>
            </form>
          )}

          {canEditDocs && (
            <form onSubmit={convertToDO} style={{ marginTop: 20 }}>
              <h3>Convert to Delivery Order</h3>
              <div className="row">
                <div><label>Delivery Date</label><input required type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
                <div><label>Signed By</label><input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} /></div>
              </div>
              <button className="btn" style={{ marginTop: 10 }} type="submit">Create Delivery Order</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

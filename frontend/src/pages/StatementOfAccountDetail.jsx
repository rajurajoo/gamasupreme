import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money } from '../format';
import logoFull from '../assets/logo-horizontal.png';

export default function StatementOfAccountDetail() {
  const { id } = useParams();
  const [soa, setSoa] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff' || user.role === 'accountant';

  function load() {
    api.get(`/statements-of-account/${id}`).then((s) => {
      setSoa(s);
      setDetails((prev) => prev || {
        number: s.number || '',
        modeOfPayment: s.modeOfPayment || '',
        validUntil: s.validUntil ? s.validUntil.slice(0, 10) : '',
      });
    });
  }
  useEffect(load, [id]);

  async function saveDetails(e) {
    e.preventDefault();
    setError('');
    setDetailsSaved(false);
    try {
      await api.put(`/statements-of-account/${id}`, { ...details, validUntil: details.validUntil || null });
      setDetailsSaved(true);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleWatermark() {
    setError('');
    try { await api.put(`/statements-of-account/${id}`, { showWatermark: !soa.showWatermark }); load(); }
    catch (err) { setError(err.message); }
  }

  if (!soa || !details) return <div>Loading...</div>;
  const biz = soa.business || {};
  const customer = soa.customer || {};
  const hasBankDetails = biz.bankName || biz.bankAccountNumber || biz.bankIban;

  return (
    <div className="print-view">
      <h1 className="no-print">Statement of Account {soa.number}</h1>
      <p className="hint no-print" style={{ margin: '0 0 12px' }}>Project: {soa.project?.name}</p>

      <div className="card qt-doc qt-page">
        {soa.showWatermark && (
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
            <div className="qt-info-left-row"><strong>PROJECT:</strong> {soa.project?.name}</div>
            <div className="qt-info-left-row"><strong>SUBJECT:-</strong> STATEMENT OF ACCOUNT</div>
          </div>
          <div className="qt-info-right">
            <div className="qt-info-cell"><span className="qt-info-cell-label">SOA :No</span>{soa.number}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Date</span>{new Date(soa.createdAt).toLocaleDateString()}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Mode of Payment</span>{soa.modeOfPayment || '-'}</div>
            <div className="qt-info-cell"><span className="qt-info-cell-label">Valid Until</span>{soa.validUntil ? new Date(soa.validUntil).toLocaleDateString() : '-'}</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="qt-items-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>SL:NO</th>
                <th>DESCRIPTION</th>
                <th style={{ width: 110 }}>INVOICE AMOUNT WITH VAT (AED)</th>
                <th style={{ width: 110 }}>CREDIT AMOUNT (AED)</th>
                <th style={{ width: 110 }}>BALANCE (AED)</th>
                <th style={{ width: 90 }}>REMARK</th>
              </tr>
            </thead>
            <tbody>
              {soa.rows.map((r, idx) => (
                <tr key={r.invoiceId}>
                  <td className="qt-num">{idx + 1}</td>
                  <td className="qt-desc">TAX INVOICE NO : {r.number}<br />DATED: {new Date(r.date).toLocaleDateString()}</td>
                  <td className="qt-amt">{money(r.invoiceAmount)}</td>
                  <td className="qt-amt">{r.creditAmount ? money(r.creditAmount) : ''}</td>
                  <td className="qt-amt">{r.balance ? money(r.balance) : ''}</td>
                  <td className="qt-num">{r.remark}</td>
                </tr>
              ))}
              {soa.rows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#6b7280' }}>No invoices for this project yet.</td></tr>
              )}
            </tbody>
            {soa.rows.length > 0 && (
              <tfoot>
                <tr style={{ background: '#d1d5db', fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: 'right', border: '1px solid #111827', padding: 8 }}>TOTAL</td>
                  <td className="qt-amt" style={{ border: '1px solid #111827' }}>{money(soa.totals.invoiceAmount)}</td>
                  <td className="qt-amt" style={{ border: '1px solid #111827' }}>{money(soa.totals.creditAmount)}</td>
                  <td className="qt-amt" style={{ border: '1px solid #111827' }}>{money(soa.totals.balance)}</td>
                  <td style={{ border: '1px solid #111827' }}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="qt-closing-box" style={{ fontWeight: 700, background: '#e5e7eb' }}>
          Your Account Balance is: {money(soa.totals.balance)} — Please make the payment of the total balance by the stated due date.
          Make all cheque payable to GAMA SUPREME TECHNICAL SERVICES.
        </div>

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
      </div>

      {canEdit && (
        <div className="card no-print">
          <h3>Statement Details</h3>
          <form onSubmit={saveDetails}>
            <div className="row">
              <div><label>Statement Number</label><input value={details.number} onChange={(e) => setDetails({ ...details, number: e.target.value })} /></div>
              <div><label>Mode of Payment</label><input value={details.modeOfPayment} onChange={(e) => setDetails({ ...details, modeOfPayment: e.target.value })} placeholder="e.g. Immediate" /></div>
              <div><label>Valid Until</label><input type="date" value={details.validUntil} onChange={(e) => setDetails({ ...details, validUntil: e.target.value })} /></div>
            </div>
            {detailsSaved && <span className="hint" style={{ color: 'var(--status-green-fg)' }}>Saved</span>}
            <button className="btn secondary" style={{ marginTop: 10, display: 'block' }} type="submit">Save Details</button>
          </form>
        </div>
      )}

      <div className="card no-print">
        <h3>Actions</h3>
        {error && <div className="error-msg">{error}</div>}
        <div className="actions-bar">
          <button className="btn secondary" onClick={() => window.print()}>Print / Export View</button>
          {canEdit && <button className="btn secondary" onClick={toggleWatermark}>Watermark: {soa.showWatermark ? 'ON' : 'OFF'}</button>}
        </div>
      </div>
    </div>
  );
}

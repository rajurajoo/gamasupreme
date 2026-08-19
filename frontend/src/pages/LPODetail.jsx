import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money, amountInWords } from '../format';
import logoFull from '../assets/logo-horizontal.png';

export default function LPODetail() {
  const { id } = useParams();
  const [lpo, setLpo] = useState(null);
  const [error, setError] = useState('');
  const [terms, setTerms] = useState('');
  const [termsSaved, setTermsSaved] = useState(false);
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff' || user.role === 'accountant';

  function load() {
    api.get(`/lpos/${id}`).then((data) => {
      setLpo(data);
      setTerms((prev) => (prev === '' ? (data.termsAndConditions || '') : prev));
    });
  }
  useEffect(load, [id]);

  async function setStatus(status) {
    setError('');
    try { await api.put(`/lpos/${id}`, { status }); load(); }
    catch (err) { setError(err.message); }
  }

  async function saveTerms(e) {
    e.preventDefault();
    setError('');
    setTermsSaved(false);
    try {
      await api.put(`/lpos/${id}`, { termsAndConditions: terms });
      setTermsSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!lpo) return <div>Loading...</div>;

  const business = lpo.business || {};
  const issueDate = lpo.date ? new Date(lpo.date) : null;
  const deliveryDate = lpo.deliveryDate ? new Date(lpo.deliveryDate) : null;
  const vatRate = lpo.vatRate != null ? lpo.vatRate : 5;

  return (
    <div className="print-view lpo-doc">
      {lpo.showWatermark && (
        <div className="watermark-overlay"><span className="watermark-text">GAMA SUPREME</span></div>
      )}
      <p className="no-print" style={{ color: 'var(--text-secondary)', margin: '0 0 6px' }}>GAMA SUPREME - {business.name}</p>
      <h1 className="no-print">
        Local Purchase Order {lpo.number} <span className={`badge ${lpo.status}`}>{lpo.status}</span>
      </h1>

      <div className="card lpo-card">
        {/* Letterhead */}
        <div className="lpo-letterhead">
          <div className="lpo-letterhead-left">
            <img className="qt-full-logo" src={logoFull} alt="Gama Supreme Technical Services" />
          </div>
          <div className="lpo-letterhead-right">
            <div className="lpo-doc-title">PURCHASE ORDER</div>
            <div className="lpo-doc-number">#{lpo.number}</div>
          </div>
        </div>

        {/* Address block + date block */}
        <div className="lpo-info-row">
          <div className="lpo-addresses">
            <div className="lpo-address-col">
              <div className="lpo-address-label">Vendor Address</div>
              <div className="lpo-address-name">{lpo.supplierName}</div>
              {lpo.supplierContact && <div className="lpo-address-line">{lpo.supplierContact}</div>}
            </div>
            <div className="lpo-address-col">
              <div className="lpo-address-label">Deliver To</div>
              <div className="lpo-address-name">GAMA SUPREME TECHNICAL SERVICES</div>
              {business.trn && <div className="lpo-address-line">TRN: {business.trn}</div>}
              <div className="lpo-address-line">Dubai, United Arab Emirates</div>
              {lpo.deliveryAddress && <div className="lpo-address-line">{lpo.deliveryAddress}</div>}
            </div>
          </div>
          <div className="lpo-date-block">
            <div><span className="lpo-date-label">Date:</span> {issueDate ? issueDate.toLocaleDateString() : '-'}</div>
            <div><span className="lpo-date-label">Delivery Date:</span> {deliveryDate ? deliveryDate.toLocaleDateString() : '-'}</div>
          </div>
        </div>

        {lpo.paymentTerms && <p className="lpo-meta-line"><strong>Payment Terms:</strong> {lpo.paymentTerms}</p>}
        {lpo.notes && <p className="lpo-meta-line"><strong>Notes:</strong> {lpo.notes}</p>}

        {/* Items table */}
        <table className="lpo-items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item &amp; Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Tax %</th>
              <th>Tax</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lpo.items.map((i, idx) => {
              const amount = i.qty * i.unitRate;
              const tax = amount * (vatRate / 100);
              return (
                <tr key={i.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <div>{i.description}{i.unit ? ` (${i.unit})` : ''}</div>
                    {issueDate && <div className="lpo-item-subline">LPO Sent on - {issueDate.toLocaleDateString()}</div>}
                  </td>
                  <td>{i.qty}</td>
                  <td>{money(i.unitRate)}</td>
                  <td>{vatRate}%</td>
                  <td>{money(tax)}</td>
                  <td>{money(amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="lpo-totals">
          <div className="lpo-totals-row"><span>Sub Total</span><span>{money(lpo.subtotal)}</span></div>
          <div className="lpo-totals-row"><span>Standard Rate ({vatRate}%)</span><span>{money(lpo.vatAmount)}</span></div>
          <div className="lpo-totals-row lpo-totals-grand"><span>Total</span><span>{money(lpo.total)}</span></div>
        </div>
        <p className="hint" style={{ marginTop: 8, fontStyle: 'italic' }}>Amount in Words: {amountInWords(lpo.total)}</p>
        {lpo.termsAndConditions && (
          <div style={{ marginTop: 16 }}>
            <h3>Terms &amp; Conditions</h3>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 13 }}>{lpo.termsAndConditions}</p>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="card no-print lpo-actions-card">
          <h3>Actions</h3>
          {error && <div className="error-msg">{error}</div>}
          <div className="actions-bar">
            {lpo.status === 'draft' && <button className="btn" onClick={() => setStatus('issued')}>Mark as Issued</button>}
            {lpo.status === 'issued' && <button className="btn" onClick={() => setStatus('completed')}>Mark as Completed</button>}
            <button className="btn secondary" onClick={() => window.print()}>Export as PDF</button>
            <button className="btn secondary" onClick={async () => { setError(''); try { await api.put(`/lpos/${id}`, { showWatermark: !lpo.showWatermark }); load(); } catch (err) { setError(err.message); } }}>Watermark: {lpo.showWatermark ? 'ON' : 'OFF'}</button>
          </div>

          <form onSubmit={saveTerms} style={{ marginTop: 20 }}>
            <h3>Terms &amp; Conditions</h3>
            <textarea
              rows={5}
              style={{ width: '100%' }}
              value={terms}
              onChange={(e) => { setTerms(e.target.value); setTermsSaved(false); }}
              placeholder="e.g. Payment due within 30 days of delivery."
            />
            <button className="btn secondary" style={{ marginTop: 10 }} type="submit">Save Terms</button>
            {termsSaved && <span className="hint" style={{ marginLeft: 10, color: 'var(--status-green-fg)' }}>Saved</span>}
          </form>
        </div>
      )}
    </div>
  );
}

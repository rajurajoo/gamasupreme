import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { money } from '../format';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEditDocs = user.role === 'admin' || user.role === 'sales_staff';
  const canRecordPayment = user.role === 'admin' || user.role === 'sales_staff' || user.role === 'accountant';

  function load() { api.get(`/invoices/${id}`).then((i) => { setInv(i); setAmountPaid(i.amountPaid); }); }
  useEffect(load, [id]);

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

  if (!inv) return <div>Loading...</div>;
  const customer = inv.quotation.customer;
  const isDoorMfg = inv.business?.code === 'DM';

  return (
    <div className="print-view">
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 6px' }}>GAMA SUPREME - {inv.business?.name}</p>
      <h1>Invoice {inv.number} <span className={`badge ${inv.status}`}>{inv.status}</span></h1>
      <div className="card">
        <p><strong>Business TRN:</strong> {inv.business?.trn || 'Not set'}</p>
        <p><strong>Customer:</strong> {customer.name}<br />{customer.email} {customer.phone}</p>
        {customer.trn && <p><strong>Customer TRN:</strong> {customer.trn}</p>}
        <p><strong>From Quotation:</strong> {inv.quotation.number} &nbsp; <strong>Due:</strong> {new Date(inv.dueDate).toLocaleDateString()}</p>
        {inv.project && <p><strong>Project:</strong> {inv.project.name}</p>}
        <table>
          <thead>
            <tr>
              <th>Description</th><th>Qty</th><th>Unit Price</th>
              {isDoorMfg && <><th>Size</th><th>Material</th><th>Finish</th></>}
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((i) => (
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
          Subtotal: {money(inv.total)} (AED) &nbsp;
          VAT ({inv.vatRate}%): {money(inv.vatAmount)} (AED) &nbsp;
          Total: <strong>{money(inv.totalWithVat)} (AED)</strong>
          <br />
          Paid: {money(inv.amountPaid)} &nbsp;
          Balance: <strong>{money(inv.balance)}</strong>
        </div>
      </div>

      {(canRecordPayment || canEditDocs) && (
        <div className="card no-print">
          <h3>Actions</h3>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn secondary" onClick={() => window.print()}>Print / Export View</button>

          {canRecordPayment && (
            <form onSubmit={recordPayment} style={{ marginTop: 14 }}>
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

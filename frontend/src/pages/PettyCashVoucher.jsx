import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { money, amountInWords } from '../format';

export default function PettyCashVoucher() {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/petty-cash/${id}`).then(setTx).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error-msg">{error}</div>;
  if (!tx) return <p className="hint">Loading...</p>;

  const voucherNo = `PCV-${String(tx.id).padStart(5, '0')}`;

  return (
    <div className="print-view">
      <h1 className="no-print">Petty Cash Voucher {voucherNo}</h1>

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>GAMA SUPREME</h2>
          <p className="hint" style={{ margin: 0 }}>Dubai, United Arab Emirates</p>
          <h3 style={{ marginTop: 16, marginBottom: 0, letterSpacing: 1 }}>PETTY CASH {tx.type === 'advance' ? 'ADVANCE' : 'EXPENSE'} VOUCHER</h3>
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div><strong>Voucher No:</strong> {voucherNo}</div>
          <div><strong>Date:</strong> {new Date(tx.date).toLocaleDateString()}</div>
        </div>

        <table style={{ marginBottom: 20 }}>
          <tbody>
            <tr><td style={{ width: '35%', fontWeight: 700 }}>Paid To</td><td>{tx.employee?.name}</td></tr>
            <tr><td style={{ fontWeight: 700 }}>Position</td><td>{tx.employee?.position || '-'}</td></tr>
            <tr><td style={{ fontWeight: 700 }}>Purpose / Description</td><td>{tx.description || '-'}</td></tr>
            <tr><td style={{ fontWeight: 700 }}>Amount</td><td style={{ fontSize: 18, fontWeight: 700 }}>{money(tx.amount)}</td></tr>
            <tr><td style={{ fontWeight: 700 }}>Amount in Words</td><td style={{ fontStyle: 'italic' }}>{amountInWords(tx.amount)}</td></tr>
          </tbody>
        </table>

        <div className="row" style={{ marginTop: 60, justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid var(--border-color-strong)', paddingTop: 6 }}>Received By (Signature)</div>
          </div>
          <div style={{ textAlign: 'center', width: '45%' }}>
            <div style={{ borderTop: '1px solid var(--border-color-strong)', paddingTop: 6 }}>Approved By (Signature)</div>
          </div>
        </div>

        <div className="no-print" style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => window.print()}>Print / Export Voucher</button>
        </div>
      </div>
    </div>
  );
}

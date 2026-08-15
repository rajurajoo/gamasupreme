import { useState } from 'react';
import { api } from '../api';
import { money } from '../format';

export default function Reports() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  async function loadReport(e) {
    if (e) e.preventDefault();
    setError('');
    try { setReport(await api.get(`/reports/monthly/${month}`)); }
    catch (err) { setError(err.message); }
  }

  return (
    <div>
      <h1>Monthly Account Auditing Report</h1>
      <div className="card no-print">
        <form onSubmit={loadReport}>
          <label>Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />
          <button className="btn" style={{ marginTop: 12 }} type="submit">Generate Report</button>
        </form>
        {error && <div className="error-msg">{error}</div>}
      </div>

      {report && (
        <div className="card print-view">
          <h3>Report for {report.month}</h3>
          <div className="report-grid">
            <div className="report-tile"><div className="label">Invoices Issued</div><div className="value">{report.invoiceCount}</div></div>
            <div className="report-tile"><div className="label">Total Sales</div><div className="value">{money(report.totalSales)}</div></div>
            <div className="report-tile"><div className="label">Total Collected</div><div className="value">{money(report.totalCollected)}</div></div>
            <div className="report-tile"><div className="label">Outstanding</div><div className="value">{money(report.outstanding)}</div></div>
            <div className="report-tile"><div className="label">Payroll Cost</div><div className="value">{money(report.totalPayrollCost)}</div></div>
            <div className="report-tile"><div className="label">Net Summary</div><div className="value">{money(report.netSummary)}</div></div>
          </div>
          <p style={{ color: '#6b7280', fontSize: 13 }}>
            Net summary = total collected - total payroll cost for the month (payroll is shared across all businesses). Total sales reflects invoices issued in the period regardless of payment status.
          </p>

          {report.byBusiness && (
            <>
              <h4 style={{ marginTop: 18 }}>Per-Business Breakdown</h4>
              <table>
                <thead><tr><th>Business</th><th>Invoices</th><th>Total Sales</th><th>Collected</th><th>Outstanding</th></tr></thead>
                <tbody>
                  {report.byBusiness.map((b) => (
                    <tr key={b.businessId}>
                      <td>{b.businessName} ({b.businessCode})</td>
                      <td>{b.invoiceCount}</td>
                      <td>{money(b.totalSales)}</td>
                      <td>{money(b.totalCollected)}</td>
                      <td>{money(b.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="no-print" style={{ marginTop: 10 }}><button className="btn secondary" onClick={() => window.print()}>Print / Export View</button></div>
        </div>
      )}
    </div>
  );
}

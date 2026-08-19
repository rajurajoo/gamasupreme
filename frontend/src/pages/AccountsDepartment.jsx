import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AccountsDepartment() {
  const [profitLoss, setProfitLoss] = useState(null);
  const [pettyCashBalances, setPettyCashBalances] = useState([]);
  const [entries, setEntries] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const month = currentMonth();

  useEffect(() => {
    api.get(`/journal-entries/reports/profit-loss?month=${month}`).then(setProfitLoss);
    api.get('/petty-cash/balances').then(setPettyCashBalances);
    api.get('/journal-entries').then((all) => setEntries(all.slice(0, 5)));
    api.get('/payroll').then(setPayrollRuns).catch(() => {});
  }, []);

  const totalPettyCashOutstanding = pettyCashBalances.reduce((s, b) => s + b.balance, 0);

  return (
    <div>
      <h1>Accounts Department</h1>
      <p className="hint">Finance overview across all businesses — Profit &amp; Loss, petty cash, payroll, and the general ledger.</p>

      <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <p className="hint" style={{ margin: 0 }}>Net Profit / Loss ({month})</p>
          {profitLoss ? (
            <>
              <p style={{ fontSize: 28, fontWeight: 800, margin: '6px 0', color: profitLoss.netProfit >= 0 ? 'var(--status-green-fg)' : 'var(--status-red-fg)' }}>
                {money(Math.abs(profitLoss.netProfit))}
              </p>
              <p className="hint" style={{ margin: 0 }}>{profitLoss.netProfit >= 0 ? 'Profit' : 'Loss'} · Income {money(profitLoss.totalIncome)} · Expenses {money(profitLoss.totalExpenses)}</p>
            </>
          ) : <p className="hint">Loading...</p>}
          <Link to="/accounts" className="btn secondary small" style={{ marginTop: 12, display: 'inline-block' }}>View Full P&amp;L</Link>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <p className="hint" style={{ margin: 0 }}>Petty Cash Outstanding</p>
          <p style={{ fontSize: 28, fontWeight: 800, margin: '6px 0' }}>{money(totalPettyCashOutstanding)}</p>
          <p className="hint" style={{ margin: 0 }}>Across {pettyCashBalances.filter((b) => b.balance > 0).length} employee(s) holding balances</p>
          <Link to="/petty-cash" className="btn secondary small" style={{ marginTop: 12, display: 'inline-block' }}>Manage Petty Cash</Link>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <p className="hint" style={{ margin: 0 }}>Payroll Runs</p>
          <p style={{ fontSize: 28, fontWeight: 800, margin: '6px 0' }}>{payrollRuns.length}</p>
          <p className="hint" style={{ margin: 0 }}>Total payroll runs on record</p>
          <Link to="/payroll" className="btn secondary small" style={{ marginTop: 12, display: 'inline-block' }}>Go to Payroll</Link>
        </div>
      </div>

      <div className="card">
        <h3>Quick Links</h3>
        <div className="actions-bar">
          <Link to="/accounts" className="btn secondary">Chart of Accounts &amp; Journal Entries</Link>
          <Link to="/reports" className="btn secondary">Monthly Auditing Report</Link>
          <Link to="/payroll" className="btn secondary">Payroll</Link>
          <Link to="/petty-cash" className="btn secondary">Petty Cash</Link>
        </div>
      </div>

      <div className="card">
        <h3>Recent Journal Entries</h3>
        <table>
          <thead><tr><th>Date</th><th>Business</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.date).toLocaleDateString()}</td>
                <td>{e.business.name}</td>
                <td>{e.reference || '-'}</td>
                <td>{e.description || '-'}</td>
                <td>{money(e.totalDebit)}</td>
                <td>{money(e.totalCredit)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={6} className="hint">No journal entries yet.</td></tr>
            )}
          </tbody>
        </table>
        <Link to="/accounts" style={{ display: 'inline-block', marginTop: 10 }}>View all entries →</Link>
      </div>
    </div>
  );
}

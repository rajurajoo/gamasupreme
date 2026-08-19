import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';

export default function PettyCash() {
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDesc, setAdvanceDesc] = useState('');
  const [expenseEmployeeId, setExpenseEmployeeId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [error, setError] = useState('');
  const [expenseError, setExpenseError] = useState('');

  function load() {
    api.get('/petty-cash/balances').then((bs) => {
      setBalances(bs);
      if (!employeeId && bs.length) setEmployeeId(bs[0].employeeId);
      if (!expenseEmployeeId && bs.length) setExpenseEmployeeId(bs[0].employeeId);
    });
    api.get('/petty-cash').then(setTransactions);
  }
  useEffect(load, []);

  async function giveAdvance(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/petty-cash/advance', { employeeId, amount: Number(advanceAmount), description: advanceDesc });
      setAdvanceAmount('');
      setAdvanceDesc('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function recordExpense(e) {
    e.preventDefault();
    setExpenseError('');
    try {
      await api.post('/petty-cash/expense', { employeeId: expenseEmployeeId, amount: Number(expenseAmount), description: expenseDesc });
      setExpenseAmount('');
      setExpenseDesc('');
      load();
    } catch (err) {
      setExpenseError(err.message);
    }
  }

  const selectedBalance = balances.find((b) => String(b.employeeId) === String(expenseEmployeeId));

  function exportToExcel() {
    const escapeCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['Date', 'Employee', 'Type', 'Description', 'Amount'];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.employee?.name || '',
      t.type === 'advance' ? 'Advance' : 'Expense',
      t.description || '',
      (t.type === 'advance' ? '' : '-') + t.amount,
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'petty-cash-transactions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Petty Cash</h1>

      <div className="card">
        <h3>Balances</h3>
        <table>
          <thead><tr><th>Employee</th><th>Total Advance</th><th>Total Expense</th><th>Balance</th></tr></thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.employeeId}>
                <td>{b.employeeName}</td>
                <td>{money(b.totalAdvance)}</td>
                <td>{money(b.totalExpense)}</td>
                <td style={{ fontWeight: 700 }}>{money(b.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div className="card" style={{ flex: 1 }}>
          <h3>Give Advance</h3>
          <form onSubmit={giveAdvance}>
            <label>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {balances.map((b) => <option key={b.employeeId} value={b.employeeId}>{b.employeeName}</option>)}
            </select>
            <label>Amount (AED)</label>
            <input type="number" step="0.01" required value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
            <label>Description</label>
            <input value={advanceDesc} onChange={(e) => setAdvanceDesc(e.target.value)} placeholder="e.g. Initial float" />
            {error && <div className="error-msg">{error}</div>}
            <button className="btn" style={{ marginTop: 12 }} type="submit">Give Advance</button>
          </form>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3>Record Expense</h3>
          <form onSubmit={recordExpense}>
            <label>Employee</label>
            <select value={expenseEmployeeId} onChange={(e) => setExpenseEmployeeId(e.target.value)}>
              {balances.map((b) => <option key={b.employeeId} value={b.employeeId}>{b.employeeName}</option>)}
            </select>
            {selectedBalance && <p className="hint">Available: {money(selectedBalance.balance)}</p>}
            <label>Amount (AED)</label>
            <input type="number" step="0.01" required value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
            <label>Description</label>
            <input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="e.g. Fuel, site supplies" />
            {expenseError && <div className="error-msg">{expenseError}</div>}
            <button className="btn" style={{ marginTop: 12 }} type="submit">Record Expense</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ marginBottom: 0 }}>Transaction History</h3>
          <button type="button" className="btn secondary" onClick={exportToExcel} disabled={transactions.length === 0}>
            Export to Excel
          </button>
        </div>
        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Date</th><th>Employee</th><th>Type</th><th>Description</th><th>Amount</th><th></th></tr></thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.date).toLocaleDateString()}</td>
                <td>{t.employee?.name}</td>
                <td><span className={`badge ${t.type === 'advance' ? 'accepted' : 'rejected'}`}>{t.type === 'advance' ? 'Advance' : 'Expense'}</span></td>
                <td>{t.description || '-'}</td>
                <td>{t.type === 'advance' ? '+' : '-'}{money(t.amount)}</td>
                <td>{t.type === 'expense' && <Link to={`/petty-cash/${t.id}/voucher`}>Voucher</Link>}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr><td colSpan={6} className="hint">No petty cash transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

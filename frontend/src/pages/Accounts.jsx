import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';

const TYPE_LABEL = { asset: 'Asset', liability: 'Liability', equity: 'Equity', income: 'Income', expense: 'Expense' };
const emptyLine = { accountId: '', debit: '', credit: '' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filterBusinessId, setFilterBusinessId] = useState('');
  const [trialBalance, setTrialBalance] = useState([]);
  const [profitLoss, setProfitLoss] = useState(null);
  const [plMonth, setPlMonth] = useState('');

  const [entryBusinessId, setEntryBusinessId] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState([{ ...emptyLine }, { ...emptyLine }]);
  const [error, setError] = useState('');

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('expense');
  const [acctError, setAcctError] = useState('');

  function load() {
    api.get('/accounts').then(setAccounts);
    api.get('/businesses').then((bs) => {
      setBusinesses(bs);
      if (!entryBusinessId && bs.length) setEntryBusinessId(bs[0].id);
    });
    loadEntries();
    loadTrialBalance();
    loadProfitLoss();
  }
  function loadEntries() {
    const qs = filterBusinessId ? `?businessId=${filterBusinessId}` : '';
    api.get(`/journal-entries${qs}`).then(setEntries);
  }
  function loadTrialBalance() {
    const qs = filterBusinessId ? `?businessId=${filterBusinessId}` : '';
    api.get(`/journal-entries/reports/trial-balance${qs}`).then(setTrialBalance);
  }
  function loadProfitLoss() {
    const params = new URLSearchParams();
    if (filterBusinessId) params.set('businessId', filterBusinessId);
    if (plMonth) params.set('month', plMonth);
    const qs = params.toString() ? `?${params.toString()}` : '';
    api.get(`/journal-entries/reports/profit-loss${qs}`).then(setProfitLoss);
  }
  useEffect(load, []);
  useEffect(loadEntries, [filterBusinessId]);
  useEffect(loadProfitLoss, [filterBusinessId, plMonth]);
  useEffect(loadTrialBalance, [filterBusinessId]);

  function updateLine(idx, field, value) {
    const next = [...lines];
    next[idx][field] = value;
    setLines(next);
  }
  function addLine() { setLines([...lines, { ...emptyLine }]); }
  function removeLine(idx) { setLines(lines.filter((_, i) => i !== idx)); }

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = lines.length >= 2 && totalDebit === totalCredit && totalDebit > 0;

  async function createEntry(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/journal-entries', {
        businessId: entryBusinessId,
        description,
        reference,
        lines: lines.map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      });
      setDescription('');
      setReference('');
      setLines([{ ...emptyLine }, { ...emptyLine }]);
      loadEntries();
      loadTrialBalance();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addAccount(e) {
    e.preventDefault();
    setAcctError('');
    try {
      await api.post('/accounts', { code: newCode, name: newName, type: newType });
      setNewCode('');
      setNewName('');
      load();
    } catch (err) {
      setAcctError(err.message);
    }
  }

  const totalTrialDebit = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalTrialCredit = trialBalance.reduce((s, r) => s + r.credit, 0);

  return (
    <div>
      <h1>Accounts</h1>
      <p className="hint">Chart of Accounts and journal entries, shared across all businesses. Filter below to view one business, or leave unfiltered for the combined view.</p>

      <div className="card">
        <h3>Filter by Business</h3>
        <select value={filterBusinessId} onChange={(e) => setFilterBusinessId(e.target.value)}>
          <option value="">-- all businesses (combined) --</option>
          {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="card">
        <h3>New Journal Entry</h3>
        <form onSubmit={createEntry}>
          <div className="row">
            <div>
              <label>Business</label>
              <select value={entryBusinessId} onChange={(e) => setEntryBusinessId(e.target.value)}>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label>Reference</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <label>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Paid office rent" />

          <label>Lines</label>
          <table>
            <thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th></th></tr></thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td>
                    <select value={l.accountId} onChange={(e) => updateLine(idx, 'accountId', e.target.value)}>
                      <option value="">-- select --</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" step="0.01" value={l.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={l.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} /></td>
                  <td>{lines.length > 2 && <button type="button" className="btn small secondary" onClick={() => removeLine(idx)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn small secondary" onClick={addLine}>+ Add Line</button>

          <p className="hint" style={{ marginTop: 10 }}>
            Total Debit: {money(totalDebit)} &nbsp; Total Credit: {money(totalCredit)} &nbsp;
            {balanced ? <span style={{ color: 'var(--status-green-fg)' }}>Balanced</span> : <span style={{ color: 'var(--status-red-fg)' }}>Not balanced</span>}
          </p>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 10 }} type="submit" disabled={!balanced}>Post Entry</button>
        </form>
      </div>

      <div className="card">
        <h3>Journal Entries</h3>
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
      </div>

      <div className="card">
        <h3>Trial Balance</h3>
        <table>
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
          <tbody>
            {trialBalance.map((r) => (
              <tr key={r.accountId}>
                <td>{r.code}</td>
                <td><Link to={`/accounts/${r.accountId}/ledger`}>{r.name}</Link></td>
                <td style={{ textTransform: 'capitalize' }}>{TYPE_LABEL[r.type]}</td>
                <td>{money(r.debit)}</td>
                <td>{money(r.credit)}</td>
              </tr>
            ))}
            {trialBalance.length > 0 && (
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={3}>Total</td>
                <td>{money(totalTrialDebit)}</td>
                <td>{money(totalTrialCredit)}</td>
              </tr>
            )}
            {trialBalance.length === 0 && (
              <tr><td colSpan={5} className="hint">No activity yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Profit &amp; Loss</h3>
        <p className="hint">Income minus expenses (office rent, electricity, water, salaries, and any other posted expense accounts) for the selected business/month.</p>
        <label>Month (optional)</label>
        <input type="month" value={plMonth} onChange={(e) => setPlMonth(e.target.value)} style={{ maxWidth: 180 }} />

        {profitLoss && (
          <>
            <table style={{ marginTop: 14 }}>
              <thead><tr><th>Account</th><th>Amount</th></tr></thead>
              <tbody>
                <tr style={{ fontWeight: 700 }}><td colSpan={2}>Income</td></tr>
                {profitLoss.income.map((r) => (
                  <tr key={r.accountId}><td>{r.code} - {r.name}</td><td>{money(r.amount)}</td></tr>
                ))}
                {profitLoss.income.length === 0 && <tr><td colSpan={2} className="hint">No income recorded.</td></tr>}
                <tr style={{ fontWeight: 700 }}><td>Total Income</td><td>{money(profitLoss.totalIncome)}</td></tr>

                <tr style={{ fontWeight: 700 }}><td colSpan={2} style={{ paddingTop: 16 }}>Expenses</td></tr>
                {profitLoss.expenses.map((r) => (
                  <tr key={r.accountId}><td>{r.code} - {r.name}</td><td>{money(r.amount)}</td></tr>
                ))}
                {profitLoss.expenses.length === 0 && <tr><td colSpan={2} className="hint">No expenses recorded.</td></tr>}
                <tr style={{ fontWeight: 700 }}><td>Total Expenses</td><td>{money(profitLoss.totalExpenses)}</td></tr>

                <tr style={{ fontWeight: 800, fontSize: 16, borderTop: '2px solid var(--border-color-strong)' }}>
                  <td>{profitLoss.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</td>
                  <td style={{ color: profitLoss.netProfit >= 0 ? 'var(--status-green-fg)' : 'var(--status-red-fg)' }}>{money(Math.abs(profitLoss.netProfit))}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="card">
        <h3>Chart of Accounts</h3>
        <form onSubmit={addAccount} className="row" style={{ alignItems: 'flex-end' }}>
          <div><label>Code</label><input required value={newCode} onChange={(e) => setNewCode(e.target.value)} style={{ width: 90 }} /></div>
          <div><label>Name</label><input required value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
          <div>
            <label>Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}>
              {Object.keys(TYPE_LABEL).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <button className="btn secondary" type="submit">Add Account</button>
        </form>
        {acctError && <div className="error-msg">{acctError}</div>}
        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Code</th><th>Name</th><th>Type</th></tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.code}</td>
                <td><Link to={`/accounts/${a.id}/ledger`}>{a.name}</Link></td>
                <td style={{ textTransform: 'capitalize' }}>{TYPE_LABEL[a.type]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

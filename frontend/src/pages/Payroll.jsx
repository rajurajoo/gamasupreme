import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../format';

export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [adjustments, setAdjustments] = useState({}); // employeeId -> {deductions, bonuses}
  const [error, setError] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);

  function load() {
    api.get('/payroll').then(setRuns);
    api.get('/employees').then((es) => setEmployees(es.filter((e) => e.active)));
  }
  useEffect(load, []);

  function updateAdj(empId, field, value) {
    setAdjustments({ ...adjustments, [empId]: { ...adjustments[empId], [field]: value } });
  }

  async function runPayroll(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        month,
        adjustments: Object.entries(adjustments).map(([employeeId, a]) => ({
          employeeId, deductions: a.deductions || 0, bonuses: a.bonuses || 0,
        })),
      };
      const run = await api.post('/payroll', payload);
      setAdjustments({});
      load();
      setSelectedRun(run);
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <h1>Payroll</h1>
      <div className="card">
        <h3>Run Monthly Payroll</h3>
        <form onSubmit={runPayroll}>
          <label>Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />

          <table style={{ marginTop: 14 }}>
            <thead><tr><th>Employee</th><th>Base Salary</th><th>Deductions</th><th>Bonuses</th></tr></thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{money(emp.monthlySalary)}</td>
                  <td><input type="number" step="0.01" value={adjustments[emp.id]?.deductions || ''} onChange={(e) => updateAdj(emp.id, 'deductions', e.target.value)} /></td>
                  <td><input type="number" step="0.01" value={adjustments[emp.id]?.bonuses || ''} onChange={(e) => updateAdj(emp.id, 'bonuses', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Generate Payslips</button>
        </form>
      </div>

      <div className="card">
        <h3>Past Payroll Runs</h3>
        <table>
          <thead><tr><th>Month</th><th>Employees</th><th>Total Net Pay</th><th></th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.month}</td>
                <td>{r.items.length}</td>
                <td>{money(r.items.reduce((s, i) => s + i.netPay, 0))}</td>
                <td><button className="btn small secondary" onClick={() => setSelectedRun(r)}>View Payslips</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRun && (
        <div className="card print-view">
          <h3>Payslips - {selectedRun.month}</h3>
          <table>
            <thead><tr><th>Employee</th><th>Base</th><th>Deductions</th><th>Bonuses</th><th>Net Pay</th></tr></thead>
            <tbody>
              {selectedRun.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.employee.name}</td>
                  <td>{money(i.baseSalary)}</td>
                  <td>{money(i.deductions)}</td>
                  <td>{money(i.bonuses)}</td>
                  <td><strong>{money(i.netPay)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="no-print" style={{ marginTop: 10 }}>
            <button className="btn secondary" onClick={() => window.print()}>Print / Export View</button>
          </div>
        </div>
      )}
    </div>
  );
}

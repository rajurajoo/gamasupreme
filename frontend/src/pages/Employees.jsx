import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../format';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: '', position: '', monthlySalary: '', bankName: '', bankAccount: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/employees').then(setEmployees).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/employees', form);
      setForm({ name: '', position: '', monthlySalary: '', bankName: '', bankAccount: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(emp) {
    await api.put(`/employees/${emp.id}`, { active: !emp.active });
    load();
  }

  return (
    <div>
      <h1>Employees</h1>
      <div className="card">
        <h3>Add Employee</h3>
        <form onSubmit={handleAdd}>
          <div className="row">
            <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Position</label><input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
            <div><label>Monthly Salary</label><input required type="number" step="0.01" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} /></div>
          </div>
          <div className="row">
            <div><label>Bank Name (optional)</label><input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></div>
            <div><label>Bank Account (optional)</label><input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Position</th><th>Salary</th><th>Bank</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td><td>{e.position}</td><td>{money(e.monthlySalary)}</td>
                <td>{e.bankName ? `${e.bankName} - ${e.bankAccount}` : '-'}</td>
                <td>{e.active ? 'Active' : 'Inactive'}</td>
                <td><button className="btn small secondary" onClick={() => toggleActive(e)}>{e.active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

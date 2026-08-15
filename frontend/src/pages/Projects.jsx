import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', address: '', customerId: '', startDate: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/projects').then(setProjects).catch((e) => setError(e.message));
    api.get('/customers').then(setCustomers);
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projects', form);
      setForm({ name: '', address: '', customerId: '', startDate: '' });
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <h1>Projects</h1>
      <div className="card">
        <h3>New Project</h3>
        <form onSubmit={handleAdd}>
          <div className="row">
            <div><label>Project / Site Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Client</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">-- select --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="row">
            <div><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><label>Start Date</label><input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Create Project</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Client</th><th>Address</th><th>Progress</th><th></th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.customer?.name || '-'}</td>
                <td>{p.address || '-'}</td>
                <td>{p.progress}%</td>
                <td><Link to={`/projects/${p.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales_staff' });
  const [error, setError] = useState('');

  function load() {
    api.get('/users').then(setUsers).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'sales_staff' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { active: !u.active });
    load();
  }

  return (
    <div>
      <h1>Users</h1>
      <div className="card">
        <h3>Add User</h3>
        <form onSubmit={handleAdd}>
          <div className="row">
            <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Email</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="row">
            <div><label>Password</label><input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">admin</option>
                <option value="sales_staff">sales_staff</option>
                <option value="accountant">accountant</option>
              </select>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.active ? 'Active' : 'Inactive'}</td>
                <td><button className="btn small secondary" onClick={() => toggleActive(u)}>{u.active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

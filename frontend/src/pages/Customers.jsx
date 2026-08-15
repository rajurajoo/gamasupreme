import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { name: '', email: '', phone: '', address: '', trn: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.get('/customers').then(setCustomers).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
      } else {
        await api.post('/customers', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '', trn: c.trn || '' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div>
      <h1>Customers</h1>
      <div className="card">
        <h3>{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
        <form onSubmit={handleAdd}>
          <div className="row">
            <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="row">
            <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div className="row">
            <div><label>TRN (Tax Registration Number)</label><input value={form.trn} onChange={(e) => setForm({ ...form, trn: e.target.value })} placeholder="15-digit UAE TRN (optional)" /></div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">{editingId ? 'Save' : 'Add'}</button>
          {editingId && <button type="button" className="btn secondary" style={{ marginTop: 12, marginLeft: 8 }} onClick={cancelEdit}>Cancel</button>}
        </form>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>TRN</th><th></th></tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.address}</td><td>{c.trn || '-'}</td>
                <td><button type="button" className="btn secondary" onClick={() => startEdit(c)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../format';
import { useAuth } from '../AuthContext';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', sku: '', unit: '', unitCost: '', stockQty: '', reorderThreshold: '' });
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff';

  function load() { api.get('/products').then(setProducts).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/products', form);
      setForm({ name: '', sku: '', unit: '', unitCost: '', stockQty: '', reorderThreshold: '' });
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <h1>Products</h1>
      {canEdit && (
        <div className="card">
          <h3>Add Product</h3>
          <form onSubmit={handleAdd}>
            <div className="row">
              <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label>SKU</label><input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Unit</label><input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. bag, pcs" /></div>
              <div><label>Unit Cost (AED)</label><input required type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Initial Stock Qty</label><input type="number" step="0.01" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} /></div>
              <div><label>Reorder Threshold</label><input type="number" step="0.01" value={form.reorderThreshold} onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })} /></div>
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn" style={{ marginTop: 12 }} type="submit">Add Product</button>
          </form>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>SKU</th><th>Unit</th><th>Unit Cost</th><th>Stock</th><th>Reorder At</th><th></th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.unit}</td>
                <td>{money(p.unitCost)}</td>
                <td>{p.stockQty}</td>
                <td>{p.reorderThreshold}</td>
                <td>{p.lowStock ? <span className="badge low-stock">Low stock</span> : <span className="badge ok-stock">OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

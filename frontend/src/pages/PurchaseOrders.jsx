import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../format';
import { useAuth } from '../AuthContext';

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [items, setItems] = useState([{ productId: '', qty: 1, unitCost: 0 }]);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff';

  function load() {
    api.get('/purchase-orders').then(setPos).catch((e) => setError(e.message));
    api.get('/suppliers').then((ss) => { setSuppliers(ss); if (ss.length && !supplierId) setSupplierId(ss[0].id); });
    api.get('/products').then(setProducts);
  }
  useEffect(load, []);

  function updateItem(idx, field, value) {
    const next = [...items];
    next[idx][field] = value;
    setItems(next);
  }
  function addItem() { setItems([...items, { productId: '', qty: 1, unitCost: 0 }]); }

  async function addSupplier(e) {
    e.preventDefault();
    if (!newSupplierName) return;
    const s = await api.post('/suppliers', { name: newSupplierName });
    setNewSupplierName('');
    load();
    setSupplierId(s.id);
  }

  async function createPO(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/purchase-orders', { supplierId, items });
      setItems([{ productId: '', qty: 1, unitCost: 0 }]);
      load();
    } catch (err) { setError(err.message); }
  }

  async function receive(id) {
    try { await api.put(`/purchase-orders/${id}/receive`); load(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div>
      <h1>Purchase Orders</h1>
      {canEdit && (
        <div className="card">
          <h3>New Purchase Order</h3>
          <form onSubmit={createPO}>
            <label>Supplier</label>
            <div className="row">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <input placeholder="Add new supplier name" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
              <button className="btn small secondary" type="button" onClick={addSupplier}>Add Supplier</button>
            </div>

            <label>Items</label>
            <table className="items-table">
              <thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th></tr></thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>
                      <select value={i.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)}>
                        <option value="">-- select --</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </td>
                    <td><input type="number" step="0.01" value={i.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} /></td>
                    <td><input type="number" step="0.01" value={i.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn small secondary" onClick={addItem}>+ Add Item</button>
            {error && <div className="error-msg">{error}</div>}
            <button className="btn" style={{ marginTop: 12, display: 'block' }} type="submit">Create Purchase Order</button>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Number</th><th>Supplier</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {pos.map((po) => (
              <tr key={po.id}>
                <td>{po.number}</td>
                <td>{po.supplier.name}</td>
                <td>{money(po.total)}</td>
                <td><span className={`badge ${po.status}`}>{po.status}</span></td>
                <td>{canEdit && po.status === 'pending' && <button className="btn small" onClick={() => receive(po.id)}>Mark Received</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

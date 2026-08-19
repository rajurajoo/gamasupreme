import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [plateNumber, setPlateNumber] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [year, setYear] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get('/vehicles').then(setVehicles).catch((e) => setError(e.message));
    api.get('/employees').then((es) => setEmployees(es.filter((e) => e.active)));
  }
  useEffect(load, []);

  async function addVehicle(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/vehicles', { plateNumber, makeModel, year, assignedToId: assignedToId || null });
      setPlateNumber(''); setMakeModel(''); setYear(''); setAssignedToId('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(v) {
    await api.put(`/vehicles/${v.id}`, { active: !v.active });
    load();
  }

  return (
    <div>
      <h1>Vehicle Log Book</h1>

      <div className="card">
        <h3>Add Vehicle</h3>
        <form onSubmit={addVehicle}>
          <div className="row">
            <div><label>Plate Number</label><input required value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="e.g. DXB-A-12345" /></div>
            <div><label>Make / Model</label><input required value={makeModel} onChange={(e) => setMakeModel(e.target.value)} placeholder="e.g. Toyota Hiace" /></div>
            <div><label>Year</label><input value={year} onChange={(e) => setYear(e.target.value)} /></div>
          </div>
          <label>Assigned To</label>
          <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
            <option value="">-- unassigned --</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Add Vehicle</button>
        </form>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Plate Number</th><th>Make / Model</th><th>Year</th><th>Assigned To</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td>{v.plateNumber}</td>
                <td>{v.makeModel}</td>
                <td>{v.year || '-'}</td>
                <td>{v.assignedTo?.name || '-'}</td>
                <td>{v.active ? 'Active' : 'Inactive'}</td>
                <td>
                  <Link to={`/vehicles/${v.id}`} className="btn small secondary">View Log</Link>
                  <button className="btn small secondary" style={{ marginLeft: 6 }} onClick={() => toggleActive(v)}>{v.active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td colSpan={6} className="hint">No vehicles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

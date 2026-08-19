import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { money } from '../format';

export default function VehicleDetail() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState('');

  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [odometerStart, setOdometerStart] = useState('');
  const [odometerEnd, setOdometerEnd] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [notes, setNotes] = useState('');

  function load() {
    api.get(`/vehicles/${id}`).then(setVehicle).catch((e) => setError(e.message));
    api.get('/employees').then((es) => setEmployees(es.filter((e) => e.active)));
  }
  useEffect(load, [id]);

  async function addLog(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/vehicles/${id}/logs`, { driverId: driverId || null, date: date || undefined, purpose, destination, odometerStart, odometerEnd, fuelCost, notes });
      setDate(''); setPurpose(''); setDestination(''); setOdometerStart(''); setOdometerEnd(''); setFuelCost(''); setNotes('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteLog(logId) {
    try {
      await api.delete(`/vehicles/${id}/logs/${logId}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!vehicle) return <div>Loading...</div>;

  return (
    <div>
      <h1>{vehicle.plateNumber} <span className="hint">({vehicle.makeModel}{vehicle.year ? `, ${vehicle.year}` : ''})</span></h1>
      <p className="hint">Assigned to: {vehicle.assignedTo?.name || 'Unassigned'}</p>

      <div className="card">
        <h3>Log Trip</h3>
        <form onSubmit={addLog}>
          <div className="row">
            <div>
              <label>Driver</label>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">-- select --</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Purpose</label><input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Site delivery" /></div>
            <div><label>Destination</label><input value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Odometer Start (km)</label><input type="number" step="0.1" value={odometerStart} onChange={(e) => setOdometerStart(e.target.value)} /></div>
            <div><label>Odometer End (km)</label><input type="number" step="0.1" value={odometerEnd} onChange={(e) => setOdometerEnd(e.target.value)} /></div>
            <div><label>Fuel Cost (AED)</label><input type="number" step="0.01" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} /></div>
          </div>
          <label>Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit">Add Log Entry</button>
        </form>
      </div>

      <div className="card">
        <h3>Trip Log</h3>
        <table>
          <thead><tr><th>Date</th><th>Driver</th><th>Purpose</th><th>Destination</th><th>Distance (km)</th><th>Fuel Cost</th><th></th></tr></thead>
          <tbody>
            {vehicle.logs.map((l) => {
              const distance = l.odometerStart != null && l.odometerEnd != null ? l.odometerEnd - l.odometerStart : null;
              return (
                <tr key={l.id}>
                  <td>{new Date(l.date).toLocaleDateString()}</td>
                  <td>{l.driver?.name || '-'}</td>
                  <td>{l.purpose || '-'}</td>
                  <td>{l.destination || '-'}</td>
                  <td>{distance != null ? distance.toFixed(1) : '-'}</td>
                  <td>{l.fuelCost != null ? money(l.fuelCost) : '-'}</td>
                  <td><button type="button" className="btn small secondary" onClick={() => deleteLog(l.id)}>Delete</button></td>
                </tr>
              );
            })}
            {vehicle.logs.length === 0 && (
              <tr><td colSpan={7} className="hint">No trips logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

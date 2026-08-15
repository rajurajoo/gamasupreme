import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [milestoneName, setMilestoneName] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const canEdit = user.role === 'admin' || user.role === 'sales_staff';

  function load() { api.get(`/projects/${id}`).then(setProject); }
  useEffect(load, [id]);

  async function addMilestone(e) {
    e.preventDefault();
    setError('');
    try { await api.post(`/projects/${id}/milestones`, { name: milestoneName }); setMilestoneName(''); load(); }
    catch (err) { setError(err.message); }
  }

  async function setStatus(milestoneId, status) {
    try { await api.put(`/projects/${id}/milestones/${milestoneId}`, { status }); load(); }
    catch (err) { setError(err.message); }
  }

  if (!project) return <div>Loading...</div>;

  return (
    <div>
      <h1>{project.name}</h1>
      <div className="card">
        <p><strong>Client:</strong> {project.customer?.name || '-'}</p>
        <p><strong>Address:</strong> {project.address || '-'}</p>
        <p><strong>Start Date:</strong> {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</p>
        <p><strong>Overall Progress:</strong> {project.progress}%</p>
        <div style={{ background: '#e5e7eb', borderRadius: 8, height: 10, overflow: 'hidden' }}>
          <div style={{ background: '#2563eb', height: '100%', width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="card">
        <h3>Milestones</h3>
        <table>
          <thead><tr><th>Name</th><th>Status</th>{canEdit && <th>Update</th>}</tr></thead>
          <tbody>
            {project.milestones.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                {canEdit && (
                  <td>
                    <select value={m.status} onChange={(e) => setStatus(m.id, e.target.value)}>
                      <option value="pending">pending</option>
                      <option value="in-progress">in-progress</option>
                      <option value="done">done</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {canEdit && (
          <form onSubmit={addMilestone} style={{ marginTop: 14 }}>
            <label>New Milestone</label>
            <div className="row">
              <input required value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} placeholder="e.g. Flooring installation" />
              <button className="btn small" type="submit">Add</button>
            </div>
            {error && <div className="error-msg">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}

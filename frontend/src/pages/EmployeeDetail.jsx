import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, API_URL } from '../api';

const DOC_LABELS = ['Emirates ID', 'Passport', 'Visa', 'Contract', 'Certificate', 'Other'];

export default function EmployeeDetail() {
  const { id } = useParams();
  const [emp, setEmp] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [docLabel, setDocLabel] = useState('Emirates ID');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  function load() {
    api.get(`/employees/${id}`).then((data) => {
      setEmp(data);
      setForm({
        name: data.name || '', position: data.position || '', monthlySalary: data.monthlySalary || '',
        bankName: data.bankName || '', bankAccount: data.bankAccount || '',
        dateOfBirth: data.dateOfBirth || '', nationality: data.nationality || '', address: data.address || '',
        idNumber: data.idNumber || '', passportNumber: data.passportNumber || '', visaNumber: data.visaNumber || '', visaExpiryDate: data.visaExpiryDate || '',
        emergencyContactName: data.emergencyContactName || '', emergencyContactPhone: data.emergencyContactPhone || '',
      });
    }).catch((e) => setError(e.message));
  }
  useEffect(load, [id]);

  function set(field, value) {
    setForm({ ...form, [field]: value });
    setSaved(false);
  }

  async function saveForm(e) {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/employees/${id}`, form);
      setSaved(true);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadDoc() {
    const file = fileInputRef.current.files[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('label', docLabel);
      const token = localStorage.getItem('token');
      const businessId = localStorage.getItem('businessId');
      const res = await fetch(`${API_URL}/api/employees/${id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...(businessId ? { 'x-business-id': businessId } : {}) },
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }
      fileInputRef.current.value = '';
      load();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(docId) {
    try {
      await api.delete(`/employees/${id}/documents/${docId}`);
      load();
    } catch (err) {
      setUploadError(err.message);
    }
  }

  if (!emp || !form) return <div>Loading...</div>;

  return (
    <div>
      <h1>{emp.name} <span className={`badge ${emp.active ? 'accepted' : 'rejected'}`}>{emp.active ? 'Active' : 'Inactive'}</span></h1>

      <div className="card">
        <h3>Employee Details</h3>
        <form onSubmit={saveForm}>
          <div className="row">
            <div><label>Name</label><input required value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label>Position</label><input required value={form.position} onChange={(e) => set('position', e.target.value)} /></div>
            <div><label>Monthly Salary</label><input required type="number" step="0.01" value={form.monthlySalary} onChange={(e) => set('monthlySalary', e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Bank Name</label><input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} /></div>
            <div><label>Bank Account</label><input value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} /></div>
          </div>

          <h3 style={{ marginTop: 20 }}>Personal Details</h3>
          <div className="row">
            <div><label>Date of Birth</label><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></div>
            <div><label>Nationality</label><input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} /></div>
          </div>
          <label>Address</label>
          <input value={form.address} onChange={(e) => set('address', e.target.value)} />

          <h3 style={{ marginTop: 20 }}>ID / Passport / Visa</h3>
          <div className="row">
            <div><label>Emirates ID Number</label><input value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)} /></div>
            <div><label>Passport Number</label><input value={form.passportNumber} onChange={(e) => set('passportNumber', e.target.value)} /></div>
          </div>
          <div className="row">
            <div><label>Visa Number</label><input value={form.visaNumber} onChange={(e) => set('visaNumber', e.target.value)} /></div>
            <div><label>Visa Expiry Date</label><input type="date" value={form.visaExpiryDate} onChange={(e) => set('visaExpiryDate', e.target.value)} /></div>
          </div>

          <h3 style={{ marginTop: 20 }}>Emergency Contact</h3>
          <div className="row">
            <div><label>Name</label><input value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} /></div>
            <div><label>Phone</label><input value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} /></div>
          </div>

          {error && <div className="error-msg">{error}</div>}
          <button className="btn" style={{ marginTop: 14 }} type="submit">Save</button>
          {saved && <span className="hint" style={{ marginLeft: 10, color: 'var(--status-green-fg)' }}>Saved</span>}
        </form>
      </div>

      <div className="card">
        <h3>Documents</h3>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div>
            <label>Document Type</label>
            <select value={docLabel} onChange={(e) => setDocLabel(e.target.value)}>
              {DOC_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><label>File</label><input ref={fileInputRef} type="file" /></div>
          <button className="btn secondary" type="button" onClick={uploadDoc} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>
        {uploadError && <div className="error-msg">{uploadError}</div>}

        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Type</th><th>File</th><th>Uploaded</th><th></th></tr></thead>
          <tbody>
            {emp.documents.map((d) => (
              <tr key={d.id}>
                <td>{d.label}</td>
                <td><a href={`${API_URL}/uploads/employees/${d.filePath}`} target="_blank" rel="noreferrer">{d.fileName}</a></td>
                <td>{new Date(d.uploadedAt).toLocaleDateString()}</td>
                <td><button type="button" className="btn small secondary" onClick={() => deleteDoc(d.id)}>Delete</button></td>
              </tr>
            ))}
            {emp.documents.length === 0 && (
              <tr><td colSpan={4} className="hint">No documents uploaded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

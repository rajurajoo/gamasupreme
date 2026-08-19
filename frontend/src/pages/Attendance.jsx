import { useEffect, useState } from 'react';
import { api } from '../api';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'Leave' },
  { value: 'half_day', label: 'Half Day' },
];

const STATUS_BADGE_CLASS = {
  present: 'accepted',
  absent: 'rejected',
  leave: 'sent',
  half_day: 'pending',
};

const STATUS_LABEL = {
  present: 'Present',
  absent: 'Absent',
  leave: 'Leave',
  half_day: 'Half Day',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const [employees, setEmployees] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);
  const [statuses, setStatuses] = useState({}); // employeeId -> status
  const [times, setTimes] = useState({}); // employeeId -> { timeIn, timeOut }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  function loadEmployees() {
    api.get('/employees').then((es) => {
      const active = es.filter((e) => e.active);
      setEmployees(active);
      setStatuses((prev) => {
        const next = { ...prev };
        active.forEach((e) => { if (!next[e.id]) next[e.id] = 'present'; });
        return next;
      });
    });
  }

  function loadRecords() {
    api.get(`/attendance?month=${month}`).then(setRecords);
  }

  useEffect(loadEmployees, []);
  useEffect(loadRecords, [month]);

  async function saveToday(e) {
    e.preventDefault();
    setError('');
    setSavedMsg('');
    setSaving(true);
    try {
      const entries = employees.map((emp) => ({
        employeeId: emp.id,
        status: statuses[emp.id] || 'present',
        timeIn: times[emp.id]?.timeIn || null,
        timeOut: times[emp.id]?.timeOut || null,
      }));
      await api.post('/attendance/bulk', { date: todayStr(), entries });
      setSavedMsg("Today's attendance saved.");
      loadRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  function exportToExcel() {
    const escapeCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['Date', 'Employee', 'Status', 'Time In', 'Time Out'];
    const rows = sortedRecords.map((r) => [
      new Date(r.date).toLocaleDateString(),
      r.employee?.name || '',
      STATUS_LABEL[r.status] || r.status,
      r.timeIn || '',
      r.timeOut || '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1>Attendance</h1>

      <div className="card">
        <h3>Mark Today's Attendance ({todayStr()})</h3>
        <form onSubmit={saveToday}>
          <table style={{ marginTop: 14 }}>
            <thead><tr><th>Employee</th><th>Status</th><th>Time In</th><th>Time Out</th></tr></thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>
                    <select
                      value={statuses[emp.id] || 'present'}
                      onChange={(e) => setStatuses({ ...statuses, [emp.id]: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="time"
                      value={times[emp.id]?.timeIn || ''}
                      onChange={(e) => setTimes({ ...times, [emp.id]: { ...times[emp.id], timeIn: e.target.value } })}
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      value={times[emp.id]?.timeOut || ''}
                      onChange={(e) => setTimes({ ...times, [emp.id]: { ...times[emp.id], timeOut: e.target.value } })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && <div className="error-msg">{error}</div>}
          {savedMsg && <p className="hint">{savedMsg}</p>}
          <button className="btn" style={{ marginTop: 12 }} type="submit" disabled={saving}>
            {saving ? 'Saving...' : "Save Today's Attendance"}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ marginBottom: 0 }}>Attendance History - {month}</h3>
            <label>Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
          <button type="button" className="btn secondary" onClick={exportToExcel} disabled={sortedRecords.length === 0}>
            Export to Excel
          </button>
        </div>
        <table style={{ marginTop: 14 }}>
          <thead><tr><th>Date</th><th>Employee</th><th>Status</th><th>Time In</th><th>Time Out</th></tr></thead>
          <tbody>
            {sortedRecords.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td>{r.employee?.name}</td>
                <td><span className={`badge ${STATUS_BADGE_CLASS[r.status] || ''}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                <td>{r.timeIn || '-'}</td>
                <td>{r.timeOut || '-'}</td>
              </tr>
            ))}
            {sortedRecords.length === 0 && (
              <tr><td colSpan={5} className="hint">No attendance records for this month yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

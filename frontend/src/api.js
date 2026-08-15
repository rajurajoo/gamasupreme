// In production, set VITE_API_URL to the deployed backend's base URL (e.g. Railway).
// When unset (local dev), requests go through Vite's dev proxy to /api.
const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/api`;

function getToken() {
  return localStorage.getItem('token');
}

function getBusinessId() {
  return localStorage.getItem('businessId');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const businessId = getBusinessId();
  if (businessId) headers['x-business-id'] = businessId;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
};

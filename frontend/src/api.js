const API_BASE = '/api';

async function fetchAPI(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStatus: () => fetchAPI('/status'),

  getAgents: () => fetchAPI('/agents'),
  getAgent: (id) => fetchAPI(`/agents/${id}`),
  deleteAgent: (id) => fetchAPI(`/agents/${id}`, { method: 'DELETE' }),

  getGrants: () => fetchAPI('/grants'),
  getGrant: (id) => fetchAPI(`/grants/${id}`),
  createGrant: (data) => fetchAPI('/grants', { method: 'POST', body: JSON.stringify(data) }),
  updateGrant: (id, data) => fetchAPI(`/grants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrant: (id) => fetchAPI(`/grants/${id}`, { method: 'DELETE' }),

  getNotifications: () => fetchAPI('/notifications'),
  createNotification: (data) => fetchAPI('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  updateNotification: (id, data) => fetchAPI(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNotification: (id) => fetchAPI(`/notifications/${id}`, { method: 'DELETE' }),

  getPendingRequests: () => fetchAPI('/requests/pending'),
  approveRequest: (id, revokeTime) => fetchAPI(`/requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ revokeTime }) }),
  denyRequest: (id) => fetchAPI(`/requests/${id}/deny`, { method: 'POST' }),

  getWebSocketStats: () => fetchAPI('/websocket/stats'),

  getAuthorizations: () => fetchAPI('/authorizations'),
  getAuthorization: (id) => fetchAPI(`/authorizations/${id}`),
  updateAuthorization: (id, data) => fetchAPI(`/authorizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  approveAuthRequest: (id, revokeTime) => fetchAPI(`/authorizations/${id}/approve`, { method: 'POST', body: JSON.stringify({ revokeTime }) }),
  denyAuthRequest: (id) => fetchAPI(`/authorizations/${id}/deny`, { method: 'POST' }),

  getEventLogs: (limit = 100) => fetchAPI(`/events?limit=${limit}`),
  getOverview: () => fetchAPI('/overview'),
};
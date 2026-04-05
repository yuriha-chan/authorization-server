/** @format */

import {
  Agent,
  Authorization,
  Grant,
  GrantType,
  NotificationAPI,
  PendingRequest,
  Status,
  Overview,
  EventLog,
} from './types';

const API_BASE = '/api';

async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getStatus: (): Promise<Status> => fetchAPI('/status'),

  getAgents: (): Promise<Agent[]> => fetchAPI('/agents'),
  getAgent: (id: string): Promise<Agent> => fetchAPI(`/agents/${id}`),
  deleteAgent: (id: string): Promise<void> =>
    fetchAPI(`/agents/${id}`, { method: 'DELETE' }),

  getGrants: (): Promise<Grant[]> => fetchAPI('/grants'),
  getGrant: (id: string): Promise<Grant> => fetchAPI(`/grants/${id}`),
  createGrant: (data: Partial<Grant>): Promise<Grant> =>
    fetchAPI('/grants', { method: 'POST', body: JSON.stringify(data) }),
  updateGrant: (id: string, data: Partial<Grant>): Promise<Grant> =>
    fetchAPI(`/grants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrant: (id: string): Promise<void> =>
    fetchAPI(`/grants/${id}`, { method: 'DELETE' }),

  getGrantTypes: (): Promise<GrantType[]> => fetchAPI('/grant-types'),
  getGrantType: (name: string): Promise<GrantType> =>
    fetchAPI(`/grant-types/${name}`),
  createGrantType: (data: Partial<GrantType>): Promise<GrantType> =>
    fetchAPI('/grant-types', { method: 'POST', body: JSON.stringify(data) }),
  updateGrantType: (name: string, data: Partial<GrantType>): Promise<GrantType> =>
    fetchAPI(`/grant-types/${name}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrantType: (name: string): Promise<void> =>
    fetchAPI(`/grant-types/${name}`, { method: 'DELETE' }),

  getNotifications: (): Promise<NotificationAPI[]> => fetchAPI('/notifications'),
  createNotification: (data: Partial<NotificationAPI>): Promise<NotificationAPI> =>
    fetchAPI('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  updateNotification: (id: string, data: Partial<NotificationAPI>): Promise<NotificationAPI> =>
    fetchAPI(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNotification: (id: string): Promise<void> =>
    fetchAPI(`/notifications/${id}`, { method: 'DELETE' }),

  getPendingRequests: (): Promise<PendingRequest[]> => fetchAPI('/requests/pending'),
  approveRequest: (id: string, revokeTime: string): Promise<void> =>
    fetchAPI(`/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ revokeTime }),
    }),
  denyRequest: (id: string): Promise<void> =>
    fetchAPI(`/requests/${id}/deny`, { method: 'POST' }),

  getWebSocketStats: (): Promise<unknown> => fetchAPI('/websocket/stats'),

  getAuthorizations: (): Promise<Authorization[]> => fetchAPI('/authorizations'),
  getAuthorization: (id: string): Promise<Authorization> =>
    fetchAPI(`/authorizations/${id}`),
  updateAuthorization: (id: string, data: Partial<Authorization>): Promise<Authorization> =>
    fetchAPI(`/authorizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  approveAuthRequest: (id: string, revokeTime?: string): Promise<void> =>
    fetchAPI(`/authorizations/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ revokeTime }),
    }),
  denyAuthRequest: (id: string): Promise<void> =>
    fetchAPI(`/authorizations/${id}/deny`, { method: 'POST' }),

  getEventLogs: (limit = 100): Promise<EventLog[]> =>
    fetchAPI(`/events?limit=${limit}`),
  getOverview: (): Promise<Overview> => fetchAPI('/overview'),
};

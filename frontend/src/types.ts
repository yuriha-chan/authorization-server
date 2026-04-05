/** @format */

export interface Realm {
  repository: string;
  baseUrl: string;
  read?: number;
  write?: number;
}

export interface Container {
  id: string;
  uniqueName: string;
  fingerprint: string;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
  publicKey?: string;
  expiryDate?: number;
  authorizations?: Authorization[];
}

export interface Authorization {
  id: string;
  key: string;
  type: string;
  state: 'active' | 'pending' | 'approved' | 'denied' | 'revoked' | 'expired';
  realm?: Realm;
  container?: Container;
  createdAt?: string;
  updatedAt?: string;
  revokeTime?: string;
  requests?: Request[];
}

export interface Request {
  id: string;
  state: string;
  createdAt: string;
  authorization: Authorization;
  history?: HistoryEntry[];
}

export interface HistoryEntry {
  timestamp: string;
  action: string;
  admin?: string;
}

export interface PendingRequest {
  id: string;
  state: string;
  createdAt: string;
  authorization: {
    type: string;
    realm: Realm;
    container: Container;
  };
}

export interface GrantType {
  id?: string;
  name: string;
  grantCode: string;
  revokeCode: string;
  getStatusCode: string;
}

export interface Grant {
  id: string;
  name: string;
  type: string | GrantType;
  baseURL: string;
  account: string;
  secret?: string;
  defaultRevokeTime: number;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
  authorizations?: number;
}

export interface NotificationAPI {
  id: string;
  name: string;
  type: string;
  baseURL: string;
  account: string;
  secret?: string;
  channel: string;
  state: 'active' | 'paused';
}

export interface Agent {
  id: string;
  uniqueName: string;
  fingerprint: string;
  state: 'active' | 'expired' | 'revoked';
  expiryDate?: number;
  authorizations?: Authorization[];
  createdAt?: string;
  updatedAt?: string;
  publicKey?: string;
}

export interface Status {
  uptime: string;
  version: string;
  agents: number;
  pendingRequests: number;
  activeAuthorizations: number;
}

export interface Overview {
  agents: {
    active: number;
    total: number;
  };
  authorizations: {
    active: number;
    total: number;
  };
}

export interface EventLog {
  id: string;
  timestamp: string;
  type: string;
  message?: string;
  data?: EventData;
}

export interface EventData {
  id?: string;
  requestId?: string;
  authorizationId?: string;
  agentId?: string;
  containerId?: string;
  type?: string;
  realm?: Realm;
  agentUniqueName?: string;
  fingerprint?: string;
  uniqueName?: string;
  containerUniqueName?: string;
  action?: string;
  agent?: Agent;
  grantApi?: Grant;
  notificationApi?: NotificationAPI;
  channel?: string;
  timestamp?: string;
}

export interface WebSocketMessage {
  type: string;
  data: EventData;
}

export type ColorMode = 'light' | 'dark';

export type NavId = 
  | 'overview' 
  | 'requests' 
  | 'agents' 
  | 'authorizations' 
  | 'grants' 
  | 'grant-types' 
  | 'notifications';

export interface NavItem {
  id: NavId;
  label: string;
  icon: string;
  badge?: boolean;
}

// src/websocket/types.ts
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  messageId: string;
}

export interface AdminWebSocketMessage extends WebSocketMessage {
  type: 
    | 'connected'
    | 'new_pending_request'
    | 'request_approved'
    | 'request_denied'
    | 'agent_updated'
    | 'grant_api_updated'
    | 'notification_api_updated'
    | 'authorization_revoked'
    | 'notification_delivery_failed'
    | 'pong'
    | 'subscribed'
    | 'unsubscribed';
}

export interface AgentWebSocketMessage extends WebSocketMessage {
  type:
    | 'connected'
    | 'handshake_ack'
    | 'authorization_granted'
    | 'authorization_denied'
    | 'authorization_revoked'
    | 'ping'
    | 'pong'
    | 'error';
}

export interface ClientMessage extends WebSocketMessage {
  type:
    | 'subscribe_requests'
    | 'unsubscribe_requests'
    | 'ping'
    | 'pong'
    | 'mark_request_viewed';
}

import type { WebSocket as WS } from 'ws';

export type WebSocket = WS & { isAlive?: boolean };

export interface Subscription {
  clientId: string;
  topics: Set<string>;
  ws: WebSocket;
}

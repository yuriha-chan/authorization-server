// src/websocket/manager.ts
import type { WebSocket } from './types';
import { randomUUID } from 'crypto';
import { WebSocketMessage, ClientMessage, Subscription } from './types';

export class WebSocketManager {
  private clients: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHandlers: Map<string, Array<(clientId: string, message: ClientMessage) => void>> = new Map();

  constructor() {
    this.setupHeartbeat();
  }

  private setupHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((ws, clientId) => {
        if ((ws as any).isAlive === false) {
          this.disconnectClient(clientId);
        } else {
          (ws as any).isAlive = false;
          ws.ping();
        }
      });
    }, 30000);
  }

  registerClient(clientId: string, ws: WebSocket): void {
    this.clients.set(clientId, ws);
    this.subscriptions.set(clientId, {
      clientId,
      topics: new Set(['broadcast']),
      ws: ws as any
    });

    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    ws.on('close', () => {
      this.disconnectClient(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.disconnectClient(clientId);
    });

    (ws as any).isAlive = true;
  }

  private disconnectClient(clientId: string): void {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === 1) {
      ws.close();
    }
    this.clients.delete(clientId);
    this.subscriptions.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  }

  subscribe(clientId: string, topic: string): void {
    const subscription = this.subscriptions.get(clientId);
    if (subscription) {
      subscription.topics.add(topic);
      this.sendToClient(clientId, {
        type: 'subscribed',
        data: { topic },
        timestamp: Date.now(),
        messageId: randomUUID()
      });
    }
  }

  unsubscribe(clientId: string, topic: string): void {
    const subscription = this.subscriptions.get(clientId);
    if (subscription) {
      subscription.topics.delete(topic);
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        data: { topic },
        timestamp: Date.now(),
        messageId: randomUUID()
      });
    }
  }

  broadcast(topic: string, message: Omit<WebSocketMessage, 'messageId' | 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
      messageId: randomUUID()
    };

    let sentCount = 0;
    this.subscriptions.forEach((subscription) => {
      if (subscription.topics.has(topic)) {
        this.sendToClient(subscription.clientId, fullMessage);
        sentCount++;
      }
    });

    console.log(`Broadcasted message to ${sentCount} clients on topic "${topic}"`);
  }

  sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Failed to send message to ${clientId}:`, error);
        return false;
      }
    }
    return false;
  }

  sendToTopic(topic: string, message: Omit<WebSocketMessage, 'messageId' | 'timestamp'>): number {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
      messageId: randomUUID()
    };

    let sentCount = 0;
    this.subscriptions.forEach((subscription) => {
      if (subscription.topics.has(topic)) {
        if (this.sendToClient(subscription.clientId, fullMessage)) {
          sentCount++;
        }
      }
    });

    return sentCount;
  }

  onMessage(handler: (clientId: string, message: ClientMessage) => void): void {
    this.messageHandlers.set('message', [handler]);
  }

  handleMessage(clientId: string, rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage) as ClientMessage;
      const handlers = this.messageHandlers.get('message');
      if (handlers) {
        handlers.forEach(handler => handler(clientId, message));
      }
    } catch (error) {
      console.error(`Failed to parse message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        data: { error: 'Invalid message format' },
        timestamp: Date.now(),
        messageId: randomUUID()
      });
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSubscriptionCount(topic: string): number {
    let count = 0;
    this.subscriptions.forEach((subscription) => {
      if (subscription.topics.has(topic)) {
        count++;
      }
    });
    return count;
  }
}

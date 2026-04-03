// src/admin/websocket.ts
import { Server as HttpServer } from 'http';
import { WebSocketServer as WSServer, WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  id: string;
}

export class WebSocketServer {
  private wss: WSServer;
  private clients: Map<string, Client> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WSServer({ server, path: '/api/admin/ws' });
    this.setup();
  }

  private setup() {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(7);
      this.clients.set(clientId, { ws, id: clientId });
      
      console.log(`Admin client connected: ${clientId}`);
      
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`Admin client disconnected: ${clientId}`);
      });
      
      // 接続確認
      ws.send(JSON.stringify({ type: 'connected', clientId }));
    });
  }

  private handleMessage(clientId: string, message: any) {
    switch (message.type) {
      case 'subscribe_requests':
        // サブスクリプション管理（必要に応じて実装）
        break;
      case 'ping':
        this.sendTo(clientId, { type: 'pong', timestamp: Date.now() });
        break;
    }
  }

  broadcast(type: string, data: any) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  private sendTo(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }
}

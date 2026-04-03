// src/websocket/admin-websocket.ts
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketManager } from './manager';
import { eventBus } from '../events/pubsub';
import { randomUUID } from 'crypto';

export class AdminWebSocket {
  private wss: WebSocketServer;
  private manager: WebSocketManager;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/api/admin/ws',
      verifyClient: (info, cb) => {
        // ここで認証チェック（セッションまたはAPIキー）
        const apiKey = info.req.headers['x-api-key'];
        const validApiKey = process.env.ADMIN_API_KEY;
        
        if (validApiKey && apiKey !== validApiKey) {
          cb(false, 401, 'Unauthorized');
          return;
        }
        cb(true);
      }
    });
    
    this.manager = new WebSocketManager();
    this.setup();
    this.setupEventListeners();
  }

  private setup(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = randomUUID();
      const clientIp = req.socket.remoteAddress;
      
      console.log(`Admin client connected: ${clientId} from ${clientIp}`);
      
      this.manager.registerClient(clientId, ws);
      
      // 接続確認メッセージ
      this.manager.sendToClient(clientId, {
        type: 'connected',
        data: { 
          clientId,
          timestamp: Date.now(),
          serverTime: Date.now()
        },
        timestamp: Date.now(),
        messageId: randomUUID()
      });
      
      // メッセージハンドラ
      ws.on('message', (data: string) => {
        this.handleClientMessage(clientId, data);
      });
    });
  }

  private handleClientMessage(clientId: string, rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage);
      
      switch (message.type) {
        case 'subscribe_requests':
          this.manager.subscribe(clientId, 'pending_requests');
          this.manager.sendToClient(clientId, {
            type: 'subscribed',
            data: { topic: 'pending_requests' },
            timestamp: Date.now(),
            messageId: randomUUID()
          });
          break;
          
        case 'unsubscribe_requests':
          this.manager.unsubscribe(clientId, 'pending_requests');
          break;
          
        case 'mark_request_viewed':
          this.handleRequestViewed(clientId, message.data.requestId);
          break;
          
        case 'ping':
          this.manager.sendToClient(clientId, {
            type: 'pong',
            data: { timestamp: message.timestamp },
            timestamp: Date.now(),
            messageId: randomUUID()
          });
          break;
          
        default:
          console.log(`Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Failed to handle message from ${clientId}:`, error);
      this.manager.sendToClient(clientId, {
        type: 'error',
        data: { error: 'Invalid message format' },
        timestamp: Date.now(),
        messageId: randomUUID()
      });
    }
  }

  private handleRequestViewed(clientId: string, requestId: string): void {
    // リクエストが閲覧されたことを記録
    // データベースに閲覧履歴を保存する場合
    console.log(`Request ${requestId} viewed by admin ${clientId}`);
    
    // 未読カウントを減らす処理など
    this.manager.broadcast('pending_requests', {
      type: 'request_viewed',
      data: { requestId, viewedBy: clientId }
    });
  }

  private setupEventListeners(): void {
    // 新しいリクエスト
    eventBus.subscribe('request:new', (data) => {
      this.manager.broadcast('pending_requests', {
        type: 'new_pending_request',
        data: {
          requestId: data.requestId,
          agentUniqueName: data.agentUniqueName,
          fingerprint: data.fingerprint,
          realm: data.realm,
          timestamp: data.timestamp
        }
      });
    });
    
    // リクエスト承認
    eventBus.subscribe('request:approved', (data) => {
      this.manager.broadcast('pending_requests', {
        type: 'request_approved',
        data: {
          requestId: data.requestId,
          authorizationId: data.authorizationId,
          approvedBy: data.admin,
          timestamp: data.timestamp
        }
      });
    });
    
    // リクエスト拒否
    eventBus.subscribe('request:denied', (data) => {
      this.manager.broadcast('pending_requests', {
        type: 'request_denied',
        data: {
          requestId: data.requestId,
          deniedBy: data.admin,
          timestamp: data.timestamp
        }
      });
    });
    
    // Agent更新
    eventBus.subscribe('agent:updated', (data) => {
      this.manager.broadcast('agents', {
        type: 'agent_updated',
        data: {
          action: data.action,
          agent: data.agent,
          timestamp: data.timestamp
        }
      });
    });
    
    // GrantAPI更新
    eventBus.subscribe('grant:updated', (data) => {
      this.manager.broadcast('grants', {
        type: 'grant_api_updated',
        data: {
          action: data.action,
          grantApi: data.grantApi,
          timestamp: data.timestamp
        }
      });
    });
    
    // NotificationAPI更新
    eventBus.subscribe('notification:updated', (data) => {
      this.manager.broadcast('notifications', {
        type: 'notification_api_updated',
        data: {
          action: data.action,
          notificationApi: data.notificationApi,
          timestamp: data.timestamp
        }
      });
    });
    
    // 認証取り消し
    eventBus.subscribe('authorization:revoked', (data) => {
      this.manager.broadcast('authorizations', {
        type: 'authorization_revoked',
        data: {
          authorizationId: data.authorizationId,
          containerUniqueName: data.containerUniqueName,
          revokeTime: data.revokeTime,
          timestamp: data.timestamp
        }
      });
    });
    
    // 通知配信失敗
    eventBus.subscribe('notification:failed', (data) => {
      this.manager.broadcast('notifications', {
        type: 'notification_delivery_failed',
        data: {
          requestId: data.requestId,
          channel: data.channel,
          error: data.error,
          timestamp: data.timestamp
        }
      });
    });
  }

  broadcastToAdmins(type: string, data: any): void {
    this.manager.broadcast('admin_all', {
      type,
      data,
      timestamp: Date.now(),
      messageId: randomUUID()
    });
  }

  getStats(): object {
    return {
      totalClients: this.manager.getClientCount(),
      subscribedToRequests: this.manager.getSubscriptionCount('pending_requests'),
      subscribedToAgents: this.manager.getSubscriptionCount('agents'),
      subscribedToGrants: this.manager.getSubscriptionCount('grants'),
      subscribedToNotifications: this.manager.getSubscriptionCount('notifications')
    };
  }
}

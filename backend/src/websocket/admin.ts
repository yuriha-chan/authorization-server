// src/websocket/admin-websocket.ts
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketManager } from './manager';
import { eventBus } from '../events/pubsub';
import { eventNotifier } from '../events/logger';
import { notify } from '../services/notification';
import { randomUUID } from 'crypto';
import { parse as parseCookie } from 'cookie';

export class AdminWebSocket {
  private wss: WebSocketServer;
  private manager: WebSocketManager;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/api/admin/ws',
      verifyClient: (info, cb) => {
        const validApiKey = process.env.ADMIN_API_KEY;
        
        if (!validApiKey) {
          cb(true);
          return;
        }
        
        const cookieHeader = info.req.headers.cookie || '';
        const cookies = parseCookie(cookieHeader);
        const token = cookies['admin_token'];
        
        if (token !== validApiKey) {
          cb(false, 401, 'Unauthorized');
          return;
        }
        cb(true);
      }
    });

    this.wss.on('error', (err) => {
      console.error('WebSocketServer error:', err.message);
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
      
      ws.on('error', (err) => {
        console.error(`WebSocket client error: ${err.message}`);
      });
      
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
    console.log('[AdminWebSocket] Setting up event listeners');

    eventNotifier.subscribe((entry) => {
      this.manager.broadcast('broadcast', {
        type: entry.type,
        data: entry.data ? { ...entry.data, timestamp: entry.timestamp, id: entry.id } : { timestamp: entry.timestamp, id: entry.id }
      });
    });

    eventBus.subscribe('request:new', async (data) => {
      console.log('[AdminWebSocket] Received request:new event', data);
      await eventNotifier.notify('new_pending_request', '', {
        requestId: data.requestId,
        agentUniqueName: data.agentUniqueName,
        fingerprint: data.fingerprint,
        realm: data.realm,
        containerId: data.containerId,
        type: data.grantApiType,
        timestamp: data.timestamp
      });
      await notify(data);
    });
    
    eventBus.subscribe('request:approved', async (data) => {
      await eventNotifier.notify('request_approved', '', {
        requestId: data.requestId,
        authorizationId: data.authorizationId,
        approvedBy: data.admin,
        agentUniqueName: data.agentUniqueName,
        realm: data.realm,
        containerId: data.containerId
      });
    });

    eventBus.subscribe('request:denied', async (data) => {
      await eventNotifier.notify('request_denied', '', {
        requestId: data.requestId,
        deniedBy: data.admin,
        agentUniqueName: data.agentUniqueName,
        realm: data.realm,
        containerId: data.containerId
      });
    });
    
    eventBus.subscribe('agent:registered', async (data) => {
      await eventNotifier.notify('agent_registered', `Agent "${data.uniqueName}" registered`, {
        agentId: data.agentId,
        uniqueName: data.uniqueName,
        fingerprint: data.fingerprint,
        timestamp: data.timestamp
      });
    });
    
    eventBus.subscribe('agent:updated', async (data) => {
      await eventNotifier.notify('agent_updated', '', {
        action: data.action,
        agent: data.agent
      });
    });
    
    eventBus.subscribe('grant:updated', async (data) => {
      await eventNotifier.notify('grant_api_updated', '', {
        action: data.action,
        grantApi: data.grantApi
      });
    });
    
    eventBus.subscribe('notification:updated', async (data) => {
      await eventNotifier.notify('notification_api_updated', '', {
        action: data.action,
        notificationApi: data.notificationApi
      });
    });
    
    eventBus.subscribe('authorization:revoked', async (data) => {
      await eventNotifier.notify('authorization_revoked', '', {
        authorizationId: data.authorizationId,
        containerUniqueName: data.containerUniqueName
      });
    });
    
    eventBus.subscribe('notification:failed', async (data) => {
      await eventNotifier.notify('notification_delivery_failed', '', {
        requestId: data.requestId,
        channel: data.channel,
        error: data.error
      });
    });
  }

  broadcastToAdmins(type: string, data: any): void {
    this.manager.broadcast('admin_all', {
      type,
      data
    });
  }

  broadcastToTopic(topic: string, type: string, data: any): void {
    this.manager.sendToTopic(topic, {
      type,
      data
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

// src/websocket/agent-websocket.ts
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketManager } from './manager';
import { eventBus } from '../events/pubsub';
import { AppDataSource } from '../db/data-source';
import { AgentContainer } from '../entities/AgentContainer';
import { randomUUID, createVerify } from 'crypto';

interface AgentSession {
  clientId: string;
  agentId: string;
  fingerprint: string;
  ws: WebSocket;
}

export class AgentWebSocket {
  private wss: WebSocketServer;
  private manager: WebSocketManager;
  private agentSessions: Map<string, AgentSession> = new Map(); // clientId -> session
  private agentByFingerprint: Map<string, string> = new Map(); // fingerprint -> clientId

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/api/agent/ws'
    });
    
    this.manager = new WebSocketManager();
    this.setup();
    this.setupEventListeners();
  }

  private setup(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = randomUUID();
      console.log(`Agent connection attempt: ${clientId}`);
      
      ws.once('message', (data: string) => {
        this.handleHandshake(clientId, ws, data);
      });
      
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });
      
      ws.on('error', (error) => {
        console.error(`Agent WebSocket error for ${clientId}:`, error);
        this.handleDisconnect(clientId);
      });
    });
  }

  private async handleHandshake(clientId: string, ws: WebSocket, rawMessage: string): Promise<void> {
    try {
      const message = JSON.parse(rawMessage);
      
      if (message.type !== 'handshake') {
        ws.close(1002, 'Protocol error: handshake required');
        return;
      }
      
      const { fingerprint, timestamp, signature, nonce } = message.data;
      
      // タイムスタンプ検証（5分以内）
      const now = Date.now();
      if (Math.abs(now - timestamp) > 300000) {
        ws.send(JSON.stringify({
          type: 'handshake_ack',
          data: { status: 'failed', error: 'Handshake expired' },
          timestamp: Date.now(),
          messageId: randomUUID()
        }));
        ws.close(1008, 'Handshake expired');
        return;
      }
      
      // Agentの公開鍵を取得
      const agentRepo = AppDataSource.getRepository(AgentContainer);
      const agent = await agentRepo.findOneBy({ fingerprint });
      
      if (!agent || agent.state !== 'active') {
        ws.send(JSON.stringify({
          type: 'handshake_ack',
          data: { status: 'failed', error: 'Agent not found or inactive' },
          timestamp: Date.now(),
          messageId: randomUUID()
        }));
        ws.close(1008, 'Authentication failed');
        return;
      }
      
      // 署名検証
      const verifier = createVerify('SHA256');
      verifier.update(`${timestamp}${nonce}`);
      verifier.end();
      
      const isValid = verifier.verify(agent.publicKey, signature, 'base64');
      
      if (!isValid) {
        ws.send(JSON.stringify({
          type: 'handshake_ack',
          data: { status: 'failed', error: 'Invalid signature' },
          timestamp: Date.now(),
          messageId: randomUUID()
        }));
        ws.close(1008, 'Authentication failed');
        return;
      }
      
      // ハンドシェイク成功
      this.manager.registerClient(clientId, ws);
      
      const session: AgentSession = {
        clientId,
        agentId: agent.id,
        fingerprint: agent.fingerprint,
        ws
      };
      
      this.agentSessions.set(clientId, session);
      this.agentByFingerprint.set(fingerprint, clientId);
      
      ws.send(JSON.stringify({
        type: 'handshake_ack',
        data: { 
          status: 'success',
          sessionId: clientId,
          agentId: agent.id
        },
        timestamp: Date.now(),
        messageId: randomUUID()
      }));
      
      console.log(`Agent authenticated: ${agent.uniqueName} (${fingerprint})`);
      
      // メッセージハンドラを設定
      ws.on('message', (data: string) => {
        this.handleAgentMessage(clientId, data);
      });
      
    } catch (error) {
      console.error(`Handshake failed for ${clientId}:`, error);
      ws.close(1002, 'Handshake failed');
    }
  }

  private handleAgentMessage(clientId: string, rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage);
      const session = this.agentSessions.get(clientId);
      
      if (!session) {
        return;
      }
      
      switch (message.type) {
        case 'pong':
          // ハートビート応答
          break;
          
        case 'heartbeat':
          this.manager.sendToClient(clientId, {
            type: 'pong',
            data: { timestamp: message.timestamp },
            timestamp: Date.now(),
            messageId: randomUUID()
          });
          break;
          
        default:
          console.log(`Unknown agent message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Failed to handle agent message:`, error);
    }
  }

  private handleDisconnect(clientId: string): void {
    const session = this.agentSessions.get(clientId);
    if (session) {
      this.agentByFingerprint.delete(session.fingerprint);
      this.agentSessions.delete(clientId);
      console.log(`Agent disconnected: ${session.fingerprint}`);
    }
  }

  private setupEventListeners(): void {
    // 認証許可
    eventBus.subscribe('authorization:granted', async (data) => {
      const clientId = this.agentByFingerprint.get(data.fingerprint);
      if (clientId) {
        this.manager.sendToClient(clientId, {
          type: 'authorization_granted',
          data: {
            requestId: data.requestId,
            authorizationId: data.authorizationId,
            grantedKey: data.grantedKey,
            expiresAt: data.expiresAt,
            realm: data.realm
          },
          timestamp: Date.now(),
          messageId: randomUUID()
        });
      }
    });
    
    // 認証拒否
    eventBus.subscribe('authorization:denied', async (data) => {
      const clientId = this.agentByFingerprint.get(data.fingerprint);
      if (clientId) {
        this.manager.sendToClient(clientId, {
          type: 'authorization_denied',
          data: {
            requestId: data.requestId,
            reason: data.reason,
          },
          timestamp: Date.now(),
          messageId: randomUUID()
        });
      }
    });
    
    // 認証取り消し
    eventBus.subscribe('authorization:revoked', async (data) => {
      const clientId = this.agentByFingerprint.get(data.fingerprint);
      if (clientId) {
        this.manager.sendToClient(clientId, {
          type: 'authorization_revoked',
          data: {
            authorizationId: data.authorizationId,
          },
          timestamp: Date.now(),
          messageId: randomUUID()
        });
      }
    });
  }

  sendToAgent(fingerprint: string, type: string, data: any): boolean {
    const clientId = this.agentByFingerprint.get(fingerprint);
    if (clientId) {
      return this.manager.sendToClient(clientId, {
        type,
        data,
        timestamp: Date.now(),
        messageId: randomUUID()
      });
    }
    return false;
  }

  isAgentConnected(fingerprint: string): boolean {
    return this.agentByFingerprint.has(fingerprint);
  }

  getConnectedAgents(): string[] {
    return Array.from(this.agentByFingerprint.keys());
  }

  getStats(): object {
    return {
      totalConnectedAgents: this.agentSessions.size,
      agents: this.getConnectedAgents(),
      totalWebSocketClients: this.manager.getClientCount()
    };
  }
}

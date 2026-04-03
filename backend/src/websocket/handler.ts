// src/websocket/message-handler.ts
import { WebSocketManager } from './manager';
import { AppDataSource } from '../db/data-source';
import { AuthorizationRequest } from '../entities/AuthorizationRequest';
import { eventBus } from '../events/pubsub';

export class MessageHandler {
  private manager: WebSocketManager;

  constructor(manager: WebSocketManager) {
    this.manager = manager;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.manager.onMessage(async (clientId: string, message: any) => {
      switch (message.type) {
        case 'subscribe_requests':
          this.manager.subscribe(clientId, 'pending_requests');
          await this.sendInitialPendingRequests(clientId);
          break;
          
        case 'get_stats':
          await this.sendStats(clientId);
          break;
          
        case 'ping':
          this.manager.sendToClient(clientId, {
            type: 'pong',
            data: { clientPing: message.timestamp, serverTime: Date.now() },
            timestamp: Date.now(),
            messageId: message.messageId
          });
          break;
      }
    });
  }

  private async sendInitialPendingRequests(clientId: string): Promise<void> {
    const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
    const pendingRequests = await requestRepo.find({
      where: { state: 'pending' },
      relations: ['authorization', 'authorization.container'],
      order: { createdAt: 'DESC' }
    });
    
    this.manager.sendToClient(clientId, {
      type: 'initial_state',
      data: { pendingRequests },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    });
  }

  private async sendStats(clientId: string): Promise<void> {
    const agentCount = await AppDataSource.getRepository(AgentContainer).count();
    const pendingCount = await AppDataSource.getRepository(AuthorizationRequest).count({
      where: { state: 'pending' }
    });
    
    this.manager.sendToClient(clientId, {
      type: 'stats',
      data: {
        agents: agentCount,
        pendingRequests: pendingCount,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    });
  }
}

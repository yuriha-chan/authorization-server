// src/admin/routes/requests.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { AuthorizationRequest } from '../../entities/AuthorizationRequest';
import { Authorization } from '../../entities/Authorization';
import { AgentContainer } from '../../entities/AgentContainer';
import { eventBus } from '../../events/pubsub';
import { adminWebSocket } from '../server';

export const requestsRouter = Router();

requestsRouter.get('/pending', async (req, res) => {
  try {
    const requests = await AppDataSource.getRepository(AuthorizationRequest).find({
      where: { state: 'pending' },
      relations: ['authorization', 'authorization.container']
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

requestsRouter.post('/:id/approve', async (req, res) => {
  try {
    const { revokeTime } = req.body;
    const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
    const request = await requestRepo.findOne({
      where: { id: req.params.id, state: 'pending' },
      relations: ['authorization', 'authorization.container']
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    
    // 承認状態に更新
    request.state = 'approved';
    request.history = [
      ...(request.history || []),
      { action: 'approved', timestamp: new Date(), admin: req.ip }
    ];
    
    // Authorizationを有効化
    const auth = request.authorization;
    auth.state = 'active';
    if (revokeTime) {
      auth.revokeTime = new Date(Date.now() + revokeTime);
    }
    
    await AppDataSource.transaction(async (manager) => {
      await manager.save(request);
      await manager.save(auth);
    });
    
    // WebSocketでAdminに通知 (topic based)
    adminWebSocket.broadcastToTopic('pending_requests', 'request_approved', { requestId: request.id });
    
    // Redis経由でAgentプロセスに通知
    await eventBus.publish('request:approved', {
      requestId: request.id,
      authorizationId: auth.id,
      agentUniqueName: auth.container.uniqueName,
      realm: auth.realm,
      admin: req.ip
    });
    
    res.json({ message: 'Request approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

requestsRouter.post('/:id/deny', async (req, res) => {
  try {
    const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
    const request = await requestRepo.findOne({
      where: { id: req.params.id, state: 'pending' },
      relations: ['authorization', 'authorization.container']
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    
    request.state = 'denied';
    request.history = [
      ...(request.history || []),
      { action: 'denied', timestamp: new Date(), admin: req.ip }
    ];
    
    await requestRepo.save(request);
    
    // WebSocketでAdminに通知 (topic based)
    adminWebSocket.broadcastToTopic('pending_requests', 'request_denied', { requestId: request.id });
    
    // Redis経由でAgentプロセスに通知
    await eventBus.publish('request:denied', {
      requestId: request.id,
      agentUniqueName: request.authorization?.container?.uniqueName,
      realm: request.authorization?.realm,
      admin: req.ip
    });
    
    res.json({ message: 'Request denied successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deny request' });
  }
});

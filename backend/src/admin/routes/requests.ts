// src/admin/routes/requests.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { AuthorizationRequest } from '../../entities/AuthorizationRequest';
import { Authorization } from '../../entities/Authorization';
import { AgentContainer } from '../../entities/AgentContainer';
import { GrantAPI } from '../../entities/GrantAPI';
import { eventBus } from '../../events/pubsub';
import { adminWebSocket } from '../server';
import { executeGrantCode, findGrantForType } from '../../services/operation-executor';

export const requestsRouter = Router();

requestsRouter.get('/pending', async (req, res) => {
  try {
    const requests = await AppDataSource.getRepository(AuthorizationRequest).find({
      where: { state: 'pending' },
      relations: ['authorization', 'authorization.container', 'authorization.grantApi', 'authorization.grantApi.type']
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

    const auth = request.authorization;

    // Load grantApi with its type separately to ensure type is available
    // auth.grantApi may be a reference with just the ID or the full object
    const grantApiId = auth.grantApi?.id || (auth as any).grantApiId;
    if (!grantApiId) {
      return res.status(400).json({
        error: 'Authorization has no associated Grant API'
      });
    }
    const grantApi = await AppDataSource.getRepository(GrantAPI).findOne({
      where: { id: grantApiId },
      relations: ['type']
    });
    const grantApiTypeName = grantApi?.type?.name;
    if (!grantApiTypeName) {
      return res.status(400).json({
        error: 'Grant API type not found'
      });
    }

    // Find grant for this authorization type
    const grant = await findGrantForType(grantApiTypeName);
    if (!grant) {
      return res.status(400).json({
        error: `No active Grant API found for type '${grantApiTypeName}'. Please configure a grant with valid secrets.`
      });
    }

    // Execute the grant code
    let secrets: Record<string, any>;
    try {
      secrets = JSON.parse(grant.secret);
    } catch {
      secrets = { token: grant.secret };
    }

    let grantResult;
    try {
      grantResult = await executeGrantCode(
        grantApiTypeName,
        secrets,
        grant.account,
        auth.realm
      );
    } catch (execError: any) {
      // Grant code execution failed - mark authorization as failed
      auth.state = 'failed';
      auth.metadata = { 
        error: 'Grant code execution failed',
        errorMessage: execError.message,
        failedAt: new Date().toISOString()
      };
      
      const historyEntry: any = { 
        action: 'failed', 
        timestamp: new Date(), 
        admin: req.ip,
        error: execError.message 
      };
      request.history = [
        ...(request.history || []),
        historyEntry
      ];
      
      await AppDataSource.transaction(async (manager) => {
        await manager.save(request);
        await manager.save(auth);
      });
      
      // WebSocketでAdminに通知
      adminWebSocket.broadcastToTopic('pending_requests', 'request_failed', { 
        requestId: request.id,
        authorizationId: auth.id,
        error: execError.message
      });
      
      return res.status(500).json({ 
        error: 'Grant code execution failed',
        details: execError.message,
        authorizationState: 'failed'
      });
    }
    
    // 承認状態に更新
    request.state = 'approved';
    const historyEntry: any = { action: 'approved', timestamp: new Date(), admin: req.ip };
    historyEntry.grantResult = grantResult;
    request.history = [
      ...(request.history || []),
      historyEntry
    ];
    
    // Authorizationを有効化
    auth.state = 'active';
    auth.token = grantResult.token || '';
    auth.metadata = grantResult;
    if (revokeTime) {
      auth.revokeTime = new Date(Date.now() + revokeTime);
    }
    
    await AppDataSource.transaction(async (manager) => {
      await manager.save(request);
      await manager.save(auth);
    });
    
    // WebSocketでAdminに通知 (topic based)
    adminWebSocket.broadcastToTopic('pending_requests', 'request_approved', { 
      requestId: request.id,
      grantResult: { token: grantResult.token, executed: true }
    });
    
    // Redis経由でAgentプロセスに通知
    await eventBus.publish('request:approved', {
      requestId: request.id,
      authorizationId: auth.id,
      agentUniqueName: auth.container.uniqueName,
      fingerprint: auth.container.fingerprint,
      realm: auth.realm,
      admin: req.ip,
      grantResult: { token: grantResult.token, executed: true }
    });
    
    res.json({ 
      message: 'Request approved successfully',
      grantResult: { token: grantResult.token, executed: true }
    });
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
      fingerprint: request.authorization?.container?.fingerprint,
      realm: request.authorization?.realm,
      admin: req.ip
    });
    
    res.json({ message: 'Request denied successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deny request' });
  }
});

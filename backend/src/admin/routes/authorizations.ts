// src/admin/routes/authorizations.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { Authorization } from '../../entities/Authorization';
import { AuthorizationRequest } from '../../entities/AuthorizationRequest';
import { executeRevokeCode } from '../../services/operation-executor';

export const authorizationsRouter = Router();

authorizationsRouter.get('/', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Authorization);
    const authorizations = await repo.find({
      relations: ['container', 'grantApi', 'grantApi.type'],
      order: { createdAt: 'DESC' }
    });
    res.json(authorizations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch authorizations' });
  }
});

authorizationsRouter.get('/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Authorization);
    const auth = await repo.findOne({
      where: { id: req.params.id },
      relations: ['container', 'grantApi', 'grantApi.type']
    });

    if (!auth) {
      return res.status(404).json({ error: 'Authorization not found' });
    }

    const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
    const requests = await requestRepo.find({
      where: { authorization: { id: req.params.id } },
      order: { createdAt: 'DESC' }
    });

    res.json({ ...auth, requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch authorization' });
  }
});

authorizationsRouter.patch('/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Authorization);
    const auth = await repo.findOne({
      where: { id: req.params.id },
      relations: ['grantApi', 'grantApi.type']
    });
    
    if (!auth) {
      return res.status(404).json({ error: 'Authorization not found' });
    }
    
    const { revokeTime, state } = req.body;
    if (revokeTime !== undefined) auth.revokeTime = revokeTime;
    if (state !== undefined && state === 'revoked' && auth.state !== 'revoked') {
      const key = auth.key;
      const secret = auth.grantApi.secret;
      
      try {
        const result = await executeRevokeCode(
          { id: auth.id, realm: auth.realm, grantApi: { ...auth.grantApi }, key: auth.key},
          auth.metadata
        );
        
        if (!result.revoked) {
          return res.status(400).json({ error: 'Revoke operation returned false' });
        }
      } catch (err) {
        console.error('Error executing revoke code:', err);
        return res.status(500).json({ error: 'Failed to execute revoke code: ' + (err as Error).message });
      }
    }
    if (state !== undefined) auth.state = state;
    
    await repo.save(auth);
    res.json(auth);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update authorization' });
  }
});

authorizationsRouter.post('/:id/approve', async (req, res) => {
  try {
    const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
    const request = await requestRepo.findOne({
      where: { authorization: { id: req.params.id }, state: 'pending' },
      relations: ['authorization', 'authorization.container']
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Pending request not found' });
    }
    
    request.state = 'approved';
    request.history = [
      ...(request.history || []),
      { action: 'approved', timestamp: new Date(), admin: req.ip }
    ];
    
    const auth = request.authorization;
    auth.state = 'active';
    const { revokeTime } = req.body;
    if (revokeTime) {
      auth.revokeTime = new Date(revokeTime);
    }
    
    await AppDataSource.transaction(async (manager) => {
      await manager.save(request);
      await manager.save(auth);
    });
    
    res.json({ message: 'Request approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

authorizationsRouter.post('/:id/deny', async (req, res) => {
  try {
    const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
    const request = await requestRepo.findOne({
      where: { authorization: { id: req.params.id }, state: 'pending' },
      relations: ['authorization']
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
    
    res.json({ message: 'Request denied successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to deny request' });
  }
});

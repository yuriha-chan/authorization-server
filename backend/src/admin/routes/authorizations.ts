// src/admin/routes/authorizations.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { Authorization } from '../../entities/Authorization';
import { AuthorizationRequest } from '../../entities/AuthorizationRequest';

export const authorizationsRouter = Router();

authorizationsRouter.get('/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(Authorization);
    const auth = await repo.findOne({
      where: { id: req.params.id },
      relations: ['container']
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
    const auth = await repo.findOneBy({ id: req.params.id });
    
    if (!auth) {
      return res.status(404).json({ error: 'Authorization not found' });
    }
    
    const { revokeTime, state } = req.body;
    if (revokeTime !== undefined) auth.revokeTime = revokeTime;
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

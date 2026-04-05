// src/admin/routes/grants.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { GrantAPI } from '../../entities/GrantAPI';
import { GrantApiType } from '../../entities/GrantApiType';
import { grantSchema } from '../../schemas';
import { z } from 'zod';

export const grantsRouter = Router();

grantsRouter.get('/', async (req, res) => {
  try {
    const grants = await AppDataSource.getRepository(GrantAPI).find({
      where: { state: 'active' }
    });
    res.json(grants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch grants' });
  }
});

grantsRouter.get('/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(GrantAPI);
    const grant = await repo.findOneBy({ id: req.params.id });

    if (!grant) {
      return res.status(404).json({ error: 'Grant not found' });
    }

    res.json(grant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch grant' });
  }
});

grantsRouter.post('/', async (req, res) => {
  try {
    const validated = grantSchema.parse(req.body);
    const typeRepo = AppDataSource.getRepository(GrantApiType);
    const grantType = await typeRepo.findOneBy({ name: validated.type });
    
    if (!grantType) {
      return res.status(400).json({ error: `Grant API type '${validated.type}' does not exist` });
    }
    
    const repo = AppDataSource.getRepository(GrantAPI);
    const grant = repo.create({
      ...validated,
      type: grantType
    });
    await repo.save(grant);
    res.status(201).json(grant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create grant' });
    }
  }
});

grantsRouter.put('/:id', async (req, res) => {
  try {
    const validated = grantSchema.partial().parse(req.body);
    const repo = AppDataSource.getRepository(GrantAPI);
    const grant = await repo.findOneBy({ id: req.params.id });
    
    if (!grant) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    
    // If type is being updated, validate it exists
    if (validated.type) {
      const typeRepo = AppDataSource.getRepository(GrantApiType);
      const grantType = await typeRepo.findOneBy({ name: validated.type });
      
      if (!grantType) {
        return res.status(400).json({ error: `Grant API type '${validated.type}' does not exist` });
      }
      
      grant.type = grantType;
    }
    
    Object.assign(grant, validated);
    await repo.save(grant);
    
    // Reload to get the eager-loaded type relationship
    const updatedGrant = await repo.findOne({
      where: { id: req.params.id },
      relations: ['type']
    });
    
    res.json(updatedGrant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update grant' });
    }
  }
});

grantsRouter.delete('/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(GrantAPI);
    const grant = await repo.findOneBy({ id: req.params.id });
    
    if (!grant) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    
    grant.state = 'deleted';
    await repo.save(grant);
    res.json({ message: 'Grant deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete grant' });
  }
});

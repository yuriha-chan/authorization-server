// src/admin/routes/grants.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { GrantAPI } from '../../entities/GrantAPI';
import { z } from 'zod';

const grantSchema = z.object({
  type: z.string().min(1),
  baseURL: z.string().url(),
  secret: z.string().min(1),
  account: z.string().min(1),
  name: z.string().min(1),
  defaultRevokeTime: z.number().optional(),
});

export const grantsRouter = Router();

grantsRouter.get('/', async (req, res) => {
  try {
    const grants = await AppDataSource.getRepository(GrantAPI).find();
    res.json(grants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch grants' });
  }
});

grantsRouter.post('/', async (req, res) => {
  try {
    const validated = grantSchema.parse(req.body);
    const repo = AppDataSource.getRepository(GrantAPI);
    const grant = repo.create(validated);
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
    
    Object.assign(grant, validated);
    await repo.save(grant);
    res.json(grant);
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

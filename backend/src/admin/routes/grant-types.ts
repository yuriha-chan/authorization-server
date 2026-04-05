// src/admin/routes/grant-types.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { GrantApiType } from '../../entities/GrantApiType';
import { grantApiTypeSchema } from '../../schemas';
import { z } from 'zod';

export const grantTypesRouter = Router();

grantTypesRouter.get('/', async (req, res) => {
  try {
    const types = await AppDataSource.getRepository(GrantApiType).find();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch grant API types' });
  }
});

grantTypesRouter.get('/:name', async (req, res) => {
  try {
    const type = await AppDataSource.getRepository(GrantApiType).findOneBy({
      name: req.params.name
    });

    if (!type) {
      return res.status(404).json({ error: 'Grant API type not found' });
    }

    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch grant API type' });
  }
});

grantTypesRouter.post('/', async (req, res) => {
  try {
    const validated = grantApiTypeSchema.parse(req.body);
    const repo = AppDataSource.getRepository(GrantApiType);
    
    const existing = await repo.findOneBy({ name: validated.name });
    if (existing) {
      return res.status(409).json({ error: 'Grant API type with this name already exists' });
    }
    
    const type = repo.create(validated);
    await repo.save(type);
    res.status(201).json(type);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create grant API type' });
    }
  }
});

grantTypesRouter.put('/:name', async (req, res) => {
  try {
    const validated = grantApiTypeSchema.partial().parse(req.body);
    const repo = AppDataSource.getRepository(GrantApiType);
    const type = await repo.findOneBy({ name: req.params.name });
    
    if (!type) {
      return res.status(404).json({ error: 'Grant API type not found' });
    }
    
    Object.assign(type, validated);
    await repo.save(type);
    res.json(type);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update grant API type' });
    }
  }
});

grantTypesRouter.delete('/:name', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(GrantApiType);
    const type = await repo.findOneBy({ name: req.params.name });
    
    if (!type) {
      return res.status(404).json({ error: 'Grant API type not found' });
    }
    
    await repo.remove(type);
    res.json({ message: 'Grant API type deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete grant API type' });
  }
});

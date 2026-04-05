// src/admin/routes/agents.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { AgentContainer } from '../../entities/AgentContainer';

export const agentsRouter = Router();

agentsRouter.get('/', async (req, res) => {
  try {
    const agents = await AppDataSource.getRepository(AgentContainer).find({
      relations: ['authorizations']
    });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

agentsRouter.get('/:id', async (req, res) => {
  try {
    const agent = await AppDataSource.getRepository(AgentContainer).findOne({
      where: { id: req.params.id },
      relations: ['authorizations']
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

agentsRouter.delete('/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(AgentContainer);
    const agent = await repo.findOneBy({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    agent.state = 'revoked';
    await repo.save(agent);
    
    res.json({ message: 'Agent revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke agent' });
  }
});

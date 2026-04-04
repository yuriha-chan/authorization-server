// src/admin/routes/events.ts
import { Router } from 'express';
import { eventNotifier } from '../../events/logger';

export const eventsRouter = Router();

eventsRouter.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 1000);
    const logs = await eventNotifier.getLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event logs' });
  }
});

eventsRouter.get('/stats', async (req, res) => {
  try {
    const stats = await eventNotifier.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event stats' });
  }
});

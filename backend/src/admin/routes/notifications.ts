// src/admin/routes/notifications.ts
import { Router } from 'express';
import { AppDataSource } from '../../db/data-source';
import { NotificationAPI } from '../../entities/NotificationAPI';
import { z } from 'zod';

const notificationSchema = z.object({
  type: z.string().min(1),
  baseURL: z.string().url(),
  secret: z.string().min(1),
  account: z.string().min(1),
  name: z.string().min(1),
  channel: z.string().min(1),
});

export const notificationsRouter = Router();

notificationsRouter.get('/', async (req, res) => {
  try {
    const notifications = await AppDataSource.getRepository(NotificationAPI).find();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

notificationsRouter.post('/', async (req, res) => {
  try {
    const validated = notificationSchema.parse(req.body);
    const repo = AppDataSource.getRepository(NotificationAPI);
    const notification = repo.create(validated);
    await repo.save(notification);
    res.status(201).json(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }
});

notificationsRouter.put('/:id', async (req, res) => {
  try {
    const validated = notificationSchema.partial().parse(req.body);
    const repo = AppDataSource.getRepository(NotificationAPI);
    const notification = await repo.findOneBy({ id: req.params.id });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    Object.assign(notification, validated);
    await repo.save(notification);
    res.json(notification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update notification' });
    }
  }
});

notificationsRouter.delete('/:id', async (req, res) => {
  try {
    const repo = AppDataSource.getRepository(NotificationAPI);
    const notification = await repo.findOneBy({ id: req.params.id });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    notification.state = 'deleted';
    await repo.save(notification);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

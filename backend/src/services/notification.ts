// src/services/notification.ts
import { AppDataSource } from '../db/data-source';
import { NotificationAPI } from '../entities/NotificationAPI';
import { sendDiscordNotification } from './discord-notification';

interface RequestData {
  requestId: string;
  agentUniqueName: string;
  fingerprint: string;
  realm: { repository: string; read: number; write: number };
  grantApiName: string;
  grantApiType: string;
}

export async function notify(requestData: RequestData): Promise<void> {
  const notificationRepo = AppDataSource.getRepository(NotificationAPI);
  const notifications = await notificationRepo.find({
    where: { state: 'active' }
  });

  for (const notification of notifications) {
    if (notification.type === 'discord') {
      await sendDiscordNotification(notification, requestData);
    }
  }
}
// src/services/discord-notification.ts
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { NotificationAPI } from '../entities/NotificationAPI';
import { approveRequest, denyRequest } from './request-actions';

interface RequestData {
  requestId: string;
  agentUniqueName: string;
  fingerprint: string;
  realm: { repository: string; read: number; write: number };
  grantApiName: string;
  grantApiType: string;
}

const discordClients = new Map<string, Client>();

export async function sendDiscordNotification(notification: NotificationAPI, requestData: RequestData): Promise<void> {
  let client = discordClients.get(notification.secret);
  
  if (!client) {
    client = new Client({ 
      intents: [GatewayIntentBits.Guilds] 
    });
    
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      
      const customId = interaction.customId;
      if (customId.startsWith('approve_')) {
        const requestId = customId.replace('approve_', '');
        await approveRequest(requestId, 'discord');
        await interaction.reply({ content: '✅ Request approved!', ephemeral: true });
      } else if (customId.startsWith('deny_')) {
        const requestId = customId.replace('deny_', '');
        await denyRequest(requestId, 'discord');
        await interaction.reply({ content: '❌ Request denied!', ephemeral: true });
      }
    });

    await client.login(notification.secret);
    discordClients.set(notification.secret, client);
  }

  const channel = await client.channels.fetch(notification.channel) as TextChannel;
  if (!channel) {
    console.error(`Channel ${notification.channel} not found`);
    return;
  }

  const embed = {
    title: 'New Authorization Request',
    color: 0x5865F2,
    fields: [
      { name: 'Container', value: requestData.agentUniqueName, inline: true },
      { name: 'Fingerprint', value: requestData.fingerprint, inline: true },
      { name: 'Grant API', value: requestData.grantApiName, inline: true },
      { name: 'Repo', value: requestData.realm.repository, inline: true },
      { name: 'RW', value: `R:${requestData.realm.read} W:${requestData.realm.write}`, inline: true },
      { name: 'Request ID', value: requestData.requestId, inline: true }
    ],
    timestamp: new Date().toISOString()
  };

  await channel.send({
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: 'Approve',
            custom_id: `approve_${requestData.requestId}`,
            emoji: { name: '✅' }
          },
          {
            type: 2,
            style: 4,
            label: 'Deny',
            custom_id: `deny_${requestData.requestId}`,
            emoji: { name: '❌' }
          }
        ]
      }
    ]
  });
}

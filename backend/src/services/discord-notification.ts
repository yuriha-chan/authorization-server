// src/services/discord-notification.ts
import { Client, GatewayIntentBits, TextChannel, Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction } from 'discord.js';
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
const discordMessages = new Map<string, Message>();

export async function sendDiscordNotification(notification: NotificationAPI, requestData: RequestData): Promise<void> {
  let client = discordClients.get(notification.secret);
  
  if (!client) {
    client = new Client({ 
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
    });
    
    client.on('interactionCreate', async (interaction: Interaction) => {
      if (!interaction.isButton()) return;
      
      const customId = interaction.customId;
      if (customId.startsWith('approve_')) {
        const requestId = customId.replace('approve_', '');
        const result = await approveRequest(requestId, 'discord');
        
        if (result.success) {
          await interaction.reply({ content: '✅ Request approved!', ephemeral: true });
          await disableButtons(requestId);
        } else {
          await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
        }
      } else if (customId.startsWith('deny_')) {
        const requestId = customId.replace('deny_', '');
        const result = await denyRequest(requestId, 'discord');
        
        if (result.success) {
          await interaction.reply({ content: '❌ Request denied!', ephemeral: true });
          await disableButtons(requestId);
        } else {
          await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
        }
      }
    });

    await client.login(notification.secret);
    discordClients.set(notification.secret, client);
  }

  let channelId = notification.channel;
  
  if (channelId.startsWith('#') || channelId.startsWith('<#')) {
    const guilds = await client.guilds.fetch();
    for (const [_, guild] of guilds) {
      const fetchedGuild = await guild.fetch();
      const channels = await fetchedGuild.channels.fetch();
      const targetName = channelId.replace(/^#|^<#|>/g, '');
      const found = channels.find(c => c?.name === targetName);
      if (found) {
        channelId = found.id;
        break;
      }
    }
  }
  
  const channel = await client.channels.fetch(channelId) as TextChannel;
  if (!channel) {
    console.error(`Channel ${channelId} not found`);
    return;
  }

  if (!client.user) {
    console.error(`Client user not initialized`);
    return;
  }
  
  const permissions = channel.permissionsFor(client.user);
  if (!permissions || !permissions.has('SendMessages')) {
    console.error(`Bot doesn't have permission to send messages in channel ${channelId}`);
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

  const sentMessage = await channel.send({
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

  discordMessages.set(requestData.requestId, sentMessage);
}

async function disableButtons(requestId: string): Promise<void> {
  const message = discordMessages.get(requestId);
  if (!message) return;

  const disabledComponents = {
    type: 1,
    components: [
      {
        type: 2,
        style: 3,
        label: 'Approve',
        custom_id: `approve_${requestId}`,
        emoji: { name: '✅' },
        disabled: true
      },
      {
        type: 2,
        style: 4,
        label: 'Deny',
        custom_id: `deny_${requestId}`,
        emoji: { name: '❌' },
        disabled: true
      }
    ]
  };

  await message.edit({ components: [disabledComponents] });
}

import { config } from './config';
import { client } from './bot/client';
import { startWebServer } from './web/server';
import { guildRepo } from './database/db';
import { buildOAuthUrl } from './web/oauth';
import { Interaction, ButtonInteraction } from 'discord.js';

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isButton()) return;
  const btn = interaction as ButtonInteraction;

  if (!btn.customId.startsWith('verify_')) return;

  const guildId = btn.customId.replace('verify_', '');
  const oauthUrl = buildOAuthUrl(guildId);

  await btn.reply({
    content: `🔗 Clica no link abaixo para te verificares:\n${oauthUrl}`,
    ephemeral: true,
  });
});

startWebServer();
client.login(config.discord.token);

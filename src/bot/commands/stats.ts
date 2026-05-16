import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { userRepo } from '../../database/db';
import { client } from '../client';
import { config } from '../../config';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Estatísticas do bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const totalUsers = userRepo.count();
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
      .setTitle('📊 Ease Bot — Estatísticas')
      .addFields(
        { name: '👥 Utilizadores Verificados', value: `${totalUsers}`, inline: true },
        { name: '🏠 Servidores', value: `${client.guilds.cache.size}`, inline: true },
        { name: '⏱️ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: '🔗 OAuth2 URL', value: `${config.web.baseUrl}`, inline: true },
      )
      .setColor(0x5865f2)
      .setThumbnail(client.user?.avatarURL() ?? null)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;

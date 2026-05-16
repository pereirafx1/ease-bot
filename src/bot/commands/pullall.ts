import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { userRepo } from '../../database/db';
import { config } from '../../config';
import { Command } from '../client';
import { refreshTokenIfNeeded } from '../../web/oauth';

const data = new SlashCommandBuilder()
  .setName('pullall')
  .setDescription('Puxa todos os utilizadores verificados para um servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName('server_id').setDescription('ID do servidor de destino (vazio = servidor atual)').setRequired(false));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.options.getString('server_id') ?? interaction.guildId!;
    const users = userRepo.getAll();

    if (users.length === 0) {
      await interaction.editReply('❌ Nenhum utilizador na base de dados.');
      return;
    }

    await interaction.editReply(`⏳ A puxar **${users.length}** utilizadores para \`${guildId}\`...`);

    let success = 0;
    let already = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const token = await refreshTokenIfNeeded(user);
        if (!token) { failed++; continue; }

        const res = await axios.put(
          `https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`,
          { access_token: token },
          { headers: { Authorization: `Bot ${config.discord.token}`, 'Content-Type': 'application/json' } }
        );

        if (res.status === 204) already++;
        else success++;
      } catch {
        failed++;
      }

      await new Promise(r => setTimeout(r, 500));
    }

    const embed = new EmbedBuilder()
      .setTitle('📥 Pull All - Resultado')
      .addFields(
        { name: '✅ Adicionados', value: `${success}`, inline: true },
        { name: 'ℹ️ Já estavam', value: `${already}`, inline: true },
        { name: '❌ Falhas', value: `${failed}`, inline: true },
        { name: 'Total', value: `${users.length}`, inline: true },
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.followUp({ embeds: [embed], ephemeral: true });
  },
};

export default command;

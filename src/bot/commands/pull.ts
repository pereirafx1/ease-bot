import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { userRepo } from '../../database/db';
import { config } from '../../config';
import { Command } from '../client';
import { refreshTokenIfNeeded } from '../../web/oauth';

const data = new SlashCommandBuilder()
  .setName('pull')
  .setDescription('Puxa um utilizador verificado para um servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName('user_id').setDescription('ID do utilizador').setRequired(true))
  .addStringOption(o => o.setName('server_id').setDescription('ID do servidor de destino (vazio = servidor atual)').setRequired(false));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString('user_id', true);
    const guildId = interaction.options.getString('server_id') ?? interaction.guildId!;

    const user = userRepo.getById(userId);
    if (!user) {
      await interaction.editReply('❌ Utilizador não encontrado na base de dados.');
      return;
    }

    const token = await refreshTokenIfNeeded(user);
    if (!token) {
      await interaction.editReply('❌ Token do utilizador expirado e não foi possível renovar.');
      return;
    }

    try {
      await axios.put(
        `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
        { access_token: token },
        { headers: { Authorization: `Bot ${config.discord.token}`, 'Content-Type': 'application/json' } }
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Utilizador Puxado')
        .addFields(
          { name: 'Utilizador', value: `${user.global_name ?? user.username} (\`${user.id}\`)`, inline: true },
          { name: 'Servidor', value: `\`${guildId}\``, inline: true }
        )
        .setColor(0x57f287)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        await interaction.editReply('❌ Sem permissão para adicionar o utilizador a esse servidor. O bot tem de estar lá e ter permissão de `CREATE_INSTANT_INVITE`.');
      } else if (status === 204) {
        await interaction.editReply('ℹ️ O utilizador já está no servidor.');
      } else {
        await interaction.editReply(`❌ Erro ao puxar utilizador: ${err?.response?.data?.message ?? err.message}`);
      }
    }
  },
};

export default command;

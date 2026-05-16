import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { userRepo } from '../../database/db';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('user')
  .setDescription('Ver o perfil completo de um utilizador verificado')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName('user_id').setDescription('ID do utilizador').setRequired(true));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString('user_id', true);
    const user = userRepo.getById(userId);

    if (!user) {
      await interaction.editReply('❌ Utilizador não encontrado na base de dados.');
      return;
    }

    const guilds: Array<{ id: string; name: string }> = JSON.parse(user.guilds ?? '[]');
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.global_name ?? user.username}`)
      .setThumbnail(avatarUrl)
      .addFields(
        { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
        { name: '👤 Username', value: `${user.username}`, inline: true },
        { name: '📛 Nome Global', value: user.global_name ?? 'N/A', inline: true },
        { name: '📧 Email', value: user.email ?? 'N/A', inline: true },
        { name: '🖼️ Avatar', value: user.avatar ? `[Link](${avatarUrl})` : 'Default', inline: true },
        { name: '🔑 Access Token', value: `\`\`\`${user.access_token.substring(0, 40)}...\`\`\`` },
        { name: '🔄 Refresh Token', value: user.refresh_token ? `\`\`\`${user.refresh_token.substring(0, 40)}...\`\`\`` : 'N/A' },
        { name: '⏰ Token Expira', value: `<t:${Math.floor(user.token_expires_at / 1000)}:R>`, inline: true },
        { name: '✅ Verificado em', value: `<t:${Math.floor(user.verified_at / 1000)}:F>`, inline: true },
        { name: `🏠 Servidores (${guilds.length})`, value: guilds.length > 0 ? guilds.slice(0, 10).map(g => `• ${g.name} (\`${g.id}\`)`).join('\n') : 'N/A' },
      )
      .setColor(0x5865f2)
      .setFooter({ text: `Verificado no servidor: ${user.verified_guild_id}` });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;

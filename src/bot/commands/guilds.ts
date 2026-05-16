import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { userRepo } from '../../database/db';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('guilds')
  .setDescription('Ver os servidores em que um utilizador está')
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

    const guilds: Array<{ id: string; name: string; icon: string | null; owner: boolean; permissions: string }> =
      JSON.parse(user.guilds ?? '[]');

    if (guilds.length === 0) {
      await interaction.editReply('ℹ️ Nenhum servidor registado para este utilizador.');
      return;
    }

    const ownerOf = guilds.filter(g => g.owner);
    const memberOf = guilds.filter(g => !g.owner);

    const lines = guilds.slice(0, 25).map(g =>
      `${g.owner ? '👑' : '👤'} **${g.name}** (\`${g.id}\`)`
    );

    const embed = new EmbedBuilder()
      .setTitle(`🏠 Servidores de ${user.global_name ?? user.username}`)
      .setDescription(lines.join('\n'))
      .addFields(
        { name: 'Total', value: `${guilds.length}`, inline: true },
        { name: '👑 Owner', value: `${ownerOf.length}`, inline: true },
        { name: '👤 Membro', value: `${memberOf.length}`, inline: true },
      )
      .setColor(0x5865f2)
      .setFooter({ text: guilds.length > 25 ? `A mostrar 25 de ${guilds.length}` : `${guilds.length} servidores` });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;

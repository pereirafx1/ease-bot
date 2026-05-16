import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { userRepo } from '../../database/db';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('users')
  .setDescription('Lista todos os utilizadores verificados')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(o => o.setName('pagina').setDescription('Página (25 por página)').setRequired(false).setMinValue(1));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const page = (interaction.options.getInteger('pagina') ?? 1) - 1;
    const pageSize = 25;
    const all = userRepo.getAll();
    const total = all.length;
    const users = all.slice(page * pageSize, (page + 1) * pageSize);

    if (users.length === 0) {
      await interaction.editReply('❌ Nenhum utilizador encontrado.');
      return;
    }

    const lines = users.map((u, i) =>
      `\`${page * pageSize + i + 1}.\` **${u.global_name ?? u.username}** (\`${u.id}\`) — <t:${Math.floor(u.verified_at / 1000)}:R>`
    );

    const embed = new EmbedBuilder()
      .setTitle(`👥 Utilizadores Verificados — Página ${page + 1}/${Math.ceil(total / pageSize)}`)
      .setDescription(lines.join('\n'))
      .setColor(0x5865f2)
      .setFooter({ text: `Total: ${total} utilizadores` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;

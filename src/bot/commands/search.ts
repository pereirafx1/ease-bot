import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { userRepo } from '../../database/db';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Pesquisa utilizadores por username, email ou ID')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName('query').setDescription('Username, email, nome ou ID').setRequired(true));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const query = interaction.options.getString('query', true);
    const results = userRepo.search(query);

    if (results.length === 0) {
      await interaction.editReply(`❌ Nenhum resultado para \`${query}\`.`);
      return;
    }

    const lines = results.slice(0, 20).map((u, i) =>
      `\`${i + 1}.\` **${u.global_name ?? u.username}** (\`${u.id}\`) — ${u.email ?? 'sem email'}`
    );

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Resultados para "${query}"`)
      .setDescription(lines.join('\n'))
      .setColor(0x5865f2)
      .setFooter({ text: `${results.length} resultado(s) encontrado(s)` });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;

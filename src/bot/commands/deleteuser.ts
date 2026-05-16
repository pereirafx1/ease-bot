import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { userRepo } from '../../database/db';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('deleteuser')
  .setDescription('Remove um utilizador da base de dados')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName('user_id').setDescription('ID do utilizador').setRequired(true));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString('user_id', true);
    const user = userRepo.getById(userId);

    if (!user) {
      await interaction.editReply('❌ Utilizador não encontrado.');
      return;
    }

    userRepo.delete(userId);
    await interaction.editReply(`✅ Utilizador **${user.global_name ?? user.username}** (\`${userId}\`) removido.`);
  },
};

export default command;

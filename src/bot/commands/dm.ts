import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { userRepo } from '../../database/db';
import { client } from '../client';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('dm')
  .setDescription('Envia uma mensagem privada a um utilizador verificado')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName('user_id').setDescription('ID do utilizador').setRequired(true))
  .addStringOption(o => o.setName('mensagem').setDescription('Mensagem a enviar').setRequired(true));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString('user_id', true);
    const message = interaction.options.getString('mensagem', true);

    const user = userRepo.getById(userId);
    if (!user) {
      await interaction.editReply('❌ Utilizador não encontrado na base de dados.');
      return;
    }

    try {
      const discordUser = await client.users.fetch(userId);
      const dm = await discordUser.createDM();
      await dm.send(message);

      await interaction.editReply(`✅ Mensagem enviada a **${user.global_name ?? user.username}**.`);
    } catch {
      await interaction.editReply('❌ Não foi possível enviar a mensagem (utilizador pode ter DMs desativadas).');
    }
  },
};

export default command;

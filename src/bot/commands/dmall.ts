import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { userRepo } from '../../database/db';
import { client } from '../client';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('dmall')
  .setDescription('Envia uma mensagem privada a todos os utilizadores verificados')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(o => o.setName('mensagem').setDescription('Mensagem a enviar').setRequired(true));

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const message = interaction.options.getString('mensagem', true);
    const users = userRepo.getAll();

    if (users.length === 0) {
      await interaction.editReply('❌ Nenhum utilizador na base de dados.');
      return;
    }

    await interaction.editReply(`⏳ A enviar DM para **${users.length}** utilizadores...`);

    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const discordUser = await client.users.fetch(user.id);
        const dm = await discordUser.createDM();
        await dm.send(message);
        success++;
      } catch {
        failed++;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    const embed = new EmbedBuilder()
      .setTitle('📨 DM All - Resultado')
      .addFields(
        { name: '✅ Enviados', value: `${success}`, inline: true },
        { name: '❌ Falhas', value: `${failed}`, inline: true },
        { name: 'Total', value: `${users.length}`, inline: true },
      )
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.followUp({ embeds: [embed], ephemeral: true });
  },
};

export default command;

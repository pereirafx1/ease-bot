import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  TextChannel,
} from 'discord.js';
import { guildRepo } from '../../database/db';
import { Command } from '../client';

const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configura o sistema de verificação neste servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(o =>
    o.setName('canal').setDescription('Canal onde enviar a mensagem de verificação').addChannelTypes(ChannelType.GuildText).setRequired(true)
  )
  .addRoleOption(o =>
    o.setName('role').setDescription('Role a dar após verificação').setRequired(true)
  )
  .addStringOption(o =>
    o.setName('titulo').setDescription('Título do embed (opcional)').setRequired(false)
  )
  .addStringOption(o =>
    o.setName('descricao').setDescription('Descrição do embed (opcional)').setRequired(false)
  )
  .addStringOption(o =>
    o.setName('cor').setDescription('Cor hex do embed, ex: 5865F2 (opcional)').setRequired(false)
  );

const command: Command = {
  data,
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild!;
    const channel = interaction.options.getChannel('canal', true) as TextChannel;
    const role = interaction.options.getRole('role', true);
    const title = interaction.options.getString('titulo') ?? 'Verificação';
    const description = interaction.options.getString('descricao') ?? 'Clica no botão abaixo para te verificares e teres acesso ao servidor.';
    const color = interaction.options.getString('cor') ?? '5865F2';

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(parseInt(color, 16) as unknown as `#${string}`)
      .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_${guild.id}`)
        .setLabel('✅ Verificar')
        .setStyle(ButtonStyle.Success)
    );

    const existing = guildRepo.get(guild.id);
    if (existing?.message_id && existing.channel_id) {
      try {
        const oldChannel = guild.channels.cache.get(existing.channel_id) as TextChannel | undefined;
        const oldMsg = await oldChannel?.messages.fetch(existing.message_id).catch(() => undefined);
        await oldMsg?.delete().catch(() => undefined);
      } catch {}
    }

    const msg = await channel.send({ embeds: [embed], components: [row] });

    guildRepo.upsert({
      guild_id: guild.id,
      channel_id: channel.id,
      role_id: role.id,
      message_id: msg.id,
      embed_title: title,
      embed_description: description,
      embed_color: color,
    });

    await interaction.editReply(`✅ Sistema de verificação configurado em ${channel} com a role ${role}.`);
  },
};

export default command;

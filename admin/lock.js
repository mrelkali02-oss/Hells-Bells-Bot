const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock the current channel so no one can send messages')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for locking')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.error || '#ED4245')
                .setTitle('🔒 Channel Locked')
                .setDescription(`This channel has been locked by ${interaction.user}.\n**Reason:** ${reason}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error('[LOCK ERROR]', err);
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Failed to lock the channel. Check my permissions.')],
                ephemeral: true
            });
        }
    },
};

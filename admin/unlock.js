const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock the current channel so everyone can send messages again')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null, // null = reset to default
            });

            const embed = new EmbedBuilder()
                .setColor(config.colors.success || '#57F287')
                .setTitle('🔓 Channel Unlocked')
                .setDescription(`This channel has been unlocked by ${interaction.user}.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error('[UNLOCK ERROR]', err);
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Failed to unlock the channel. Check my permissions.')],
                ephemeral: true
            });
        }
    },
};

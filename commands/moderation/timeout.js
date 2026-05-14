const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to timeout')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('minutes')
                .setDescription('Duration in minutes')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the timeout'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const minutes = interaction.options.getInteger('minutes');
        const reason = interaction.options.getString('reason') ?? (config.messages.noReason || 'No reason provided');

        if (!target) {
            const errorEmbed = new EmbedBuilder().setColor(config.colors.error || 'Red').setDescription(config.messages.userNotFound || '❌ Could not find that member.');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const duration = minutes * 60 * 1000;
        await target.timeout(duration, reason);
        
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success || 'Green')
            .setDescription(config.messages.timedOut ? config.messages.timedOut.replace('{user}', target.user.tag).replace('{minutes}', minutes).replace('{reason}', reason) : `⏱️ **${target.user.tag}** has been timed out for ${minutes} minutes.\n**Reason:** ${reason}`);
            
        await interaction.reply({ embeds: [successEmbed] });

        // Logging System
        if (config.logChannelId && config.logChannelId !== "PUT_LOG_CHANNEL_ID_HERE") {
            try {
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(config.logEmbeds?.timeoutTitle || '⏱️ Member Timed Out')
                        .setColor(config.colors.warning || 'Yellow')
                        .addFields(
                            { name: config.logEmbeds?.labels?.target || 'Target', value: `${target.user.tag} (${target.id})`, inline: true },
                            { name: config.logEmbeds?.labels?.moderator || 'Moderator', value: `${interaction.user.tag}`, inline: true },
                            { name: config.logEmbeds?.labels?.duration || 'Duration', value: `${minutes} minutes`, inline: true },
                            { name: config.logEmbeds?.labels?.reason || 'Reason', value: reason }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (e) {
                console.error('[LOG ERROR]', e);
            }
        }
    },
};

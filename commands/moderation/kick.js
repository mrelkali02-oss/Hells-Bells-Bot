const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the kick'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') ?? (config.messages.noReason || 'No reason provided');

        if (!target) {
            const errorEmbed = new EmbedBuilder().setColor(config.colors.error || 'Red').setDescription(config.messages.userNotFound || '❌ Could not find that member.');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await target.kick(reason);
        
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success || 'Green')
            .setDescription(config.messages.kicked ? config.messages.kicked.replace('{user}', target.user.tag).replace('{reason}', reason) : `👢 **${target.user.tag}** has been kicked.\n**Reason:** ${reason}`);
            
        await interaction.reply({ embeds: [successEmbed] });

        // Logging System
        if (config.logChannelId && config.logChannelId !== "PUT_LOG_CHANNEL_ID_HERE") {
            try {
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(config.logEmbeds?.kickTitle || '👢 Member Kicked')
                        .setColor(config.colors.warning || 'Yellow')
                        .addFields(
                            { name: config.logEmbeds?.labels?.target || 'Target', value: `${target.user.tag} (${target.id})`, inline: true },
                            { name: config.logEmbeds?.labels?.moderator || 'Moderator', value: `${interaction.user.tag}`, inline: true },
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

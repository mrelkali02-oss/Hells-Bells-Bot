const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('claim')
        .setDescription('Claim the ticket (Support only)'),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(config.supportRoleId) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const errorEmbed = new EmbedBuilder().setColor(config.colors.error || 'Red').setDescription(config.messages.noPermission || '❌ You do not have permission to use this command.');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const ticket = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(interaction.channel.id);
        
        if (!ticket) {
            const errorEmbed = new EmbedBuilder().setColor(config.colors.error || 'Red').setDescription(config.messages.notATicket || '❌ This channel is not a registered ticket.');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const oldName = interaction.channel.name;
        await interaction.channel.setName(`claimed-${interaction.user.username}`);
        
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success || 'Green')
            .setDescription(config.messages.ticketClaimed ? config.messages.ticketClaimed.replace('{user}', interaction.user.toString()) : `✅ Ticket claimed by ${interaction.user}.`);
            
        await interaction.reply({ embeds: [successEmbed] });

        // Logging System
        if (config.logChannelId && config.logChannelId !== "PUT_LOG_CHANNEL_ID_HERE") {
            try {
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(config.logEmbeds?.ticketClaimedTitle || '✋ Ticket Claimed')
                        .setColor(config.colors.success || 'Green')
                        .addFields(
                            { name: config.logEmbeds?.labels?.ticketName || 'Ticket', value: `${oldName}`, inline: true },
                            { name: config.logEmbeds?.labels?.claimedBy || 'Claimed By', value: `${interaction.user.tag}`, inline: true }
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

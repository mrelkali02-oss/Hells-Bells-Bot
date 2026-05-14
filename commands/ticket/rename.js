const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Rename the ticket (Support only)')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('The new ticket name')
                .setRequired(true)),
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

        const newName = interaction.options.getString('name');
        const oldName = interaction.channel.name;
        await interaction.channel.setName(newName);
        
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success || 'Green')
            .setDescription(config.messages.ticketRenamed ? config.messages.ticketRenamed.replace('{name}', newName) : `✅ Ticket renamed to: **${newName}**`);
            
        await interaction.reply({ embeds: [successEmbed] });

        // Logging System
        if (config.logChannelId && config.logChannelId !== "PUT_LOG_CHANNEL_ID_HERE") {
            try {
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(config.logEmbeds?.ticketRenamedTitle || '✏️ Ticket Renamed')
                        .setColor(config.colors.primary || 'Blue')
                        .addFields(
                            { name: config.logEmbeds?.labels?.oldName || 'Old Name', value: `${oldName}`, inline: true },
                            { name: config.logEmbeds?.labels?.newName || 'New Name', value: `${newName}`, inline: true },
                            { name: config.logEmbeds?.labels?.moderator || 'Moderator', value: `${interaction.user.tag}`, inline: true }
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

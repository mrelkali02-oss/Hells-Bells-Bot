const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('إغلاق وحذف التذكرة الحالية'),
    async execute(interaction) {
        // Defer first to prevent Unknown Interaction error (transcript fetch can be slow)
        await interaction.deferReply();

        const ticket = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(interaction.channel.id);

        if (!ticket) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.notATicket)]
            });
        }

        const isOwner   = ticket.userId === interaction.user.id;
        const isSupport = interaction.member.roles.cache.has(config.supportRoleId)
                       || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isOwner && !isSupport) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.noPermission)]
            });
        }

        await interaction.editReply({
            embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription(config.messages.ticketClosing)]
        });

        db.prepare('DELETE FROM tickets WHERE channelId = ?').run(interaction.channel.id);

        // Generate Transcript and Log
        try {
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            const lines = messages
                .map(m => `[${m.createdAt.toLocaleString('ar-SA')}] ${m.author.tag}: ${m.content || '(embed/مرفق)'}`)
                .reverse()
                .join('\n');
            const attachment = new AttachmentBuilder(Buffer.from(lines, 'utf8'), {
                name: `transcript-${interaction.channel.name}.txt`
            });

            if (config.logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(config.logEmbeds?.ticketClosedTitle || '🔒 تذكرة مغلقة')
                        .setColor(config.colors.warning)
                        .addFields(
                            { name: config.logEmbeds?.labels?.ticketName || 'اسم التذكرة', value: interaction.channel.name, inline: true },
                            { name: config.logEmbeds?.labels?.closedBy   || 'أُغلق بواسطة', value: interaction.user.tag,       inline: true }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed], files: [attachment] });
                }
            }
        } catch (e) {
            console.error('[TRANSCRIPT ERROR]', e);
        }

        setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
    },
};

const {
    Events, ChannelType, PermissionsBitField, PermissionFlagsBits,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, AttachmentBuilder
} = require('discord.js');
const db = require('../database');
const config = require('../config.json');

// ─── Helper: send to log channel ────────────────────────────────────────────
async function sendLog(guild, embed) {
    if (!config.logChannelId || config.logChannelId === 'PUT_LOG_CHANNEL_ID_HERE') return;
    try {
        const ch = guild.channels.cache.get(config.logChannelId);
        if (ch) await ch.send({ embeds: [embed] });
    } catch (e) {
        console.error('[LOG ERROR]', e);
    }
}

// ─── Helper: in-ticket action buttons ────────────────────────────────────────
function buildTicketActionRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_claim').setLabel('Claim').setEmoji('✋').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_transcript').setLabel('Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    );
}

// ─── Helper: close a ticket ───────────────────────────────────────────────────
async function closeTicket(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(interaction.channel.id);
    if (!ticket) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.notATicket)],
            ephemeral: true
        });
    }

    const isOwner = ticket.userId === interaction.user.id;
    const isSupport = interaction.member.roles.cache.has(config.supportRoleId)
        || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isSupport) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.noPermission)],
            ephemeral: true
        });
    }

    await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription(config.messages.ticketClosing)]
    });

    db.prepare('DELETE FROM tickets WHERE channelId = ?').run(interaction.channel.id);

    // Generate transcript & log
    try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const lines = messages
            .map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content || '(embed/attachment)'}`)
            .reverse()
            .join('\n');
        const attachment = new AttachmentBuilder(Buffer.from(lines, 'utf8'), {
            name: `transcript-${interaction.channel.name}.txt`
        });

        const logEmbed = new EmbedBuilder()
            .setTitle(config.logEmbeds?.ticketClosedTitle || '🔒 Ticket Closed')
            .setColor(config.colors.warning)
            .addFields(
                { name: config.logEmbeds?.labels?.ticketName || 'Ticket', value: interaction.channel.name, inline: true },
                { name: config.logEmbeds?.labels?.closedBy || 'Closed By', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        if (config.logChannelId && config.logChannelId !== 'PUT_LOG_CHANNEL_ID_HERE') {
            const logCh = interaction.guild.channels.cache.get(config.logChannelId);
            if (logCh) await logCh.send({ embeds: [logEmbed], files: [attachment] });
        }
    } catch (e) {
        console.error('[TRANSCRIPT ERROR]', e);
    }

    setTimeout(() => interaction.channel.delete().catch(console.error), 5000);
}

// ─── Helper: claim a ticket ───────────────────────────────────────────────────
async function claimTicket(interaction) {
    const isSupport = interaction.member.roles.cache.has(config.supportRoleId)
        || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isSupport) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.noPermission)],
            ephemeral: true
        });
    }

    const ticket = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(interaction.channel.id);
    if (!ticket) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.notATicket)],
            ephemeral: true
        });
    }

    const oldName = interaction.channel.name;
    await interaction.channel.setName(`claimed-${interaction.user.username}`);

    const msg = (config.messages.ticketClaimed || '✅ Ticket claimed by {user}.').replace('{user}', interaction.user.toString());
    await interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(msg)]
    });

    await sendLog(interaction.guild, new EmbedBuilder()
        .setTitle(config.logEmbeds?.ticketClaimedTitle || '✋ Ticket Claimed')
        .setColor(config.colors.success)
        .addFields(
            { name: config.logEmbeds?.labels?.ticketName || 'Ticket', value: oldName, inline: true },
            { name: config.logEmbeds?.labels?.claimedBy || 'Claimed By', value: interaction.user.tag, inline: true }
        )
        .setTimestamp()
    );
}

// ─── Helper: send transcript ───────────────────────────────────────────────────
async function sendTranscript(interaction) {
    const ticket = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(interaction.channel.id);
    if (!ticket) {
        return interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.notATicket)],
            ephemeral: true
        });
    }

    try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const lines = messages
            .map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content || '(embed/attachment)'}`)
            .reverse()
            .join('\n');
        const attachment = new AttachmentBuilder(Buffer.from(lines, 'utf8'), {
            name: `transcript-${interaction.channel.name}.txt`
        });
        await interaction.reply({ content: '📄 Transcript generated:', files: [attachment], ephemeral: true });
    } catch (e) {
        console.error('[TRANSCRIPT ERROR]', e);
        await interaction.reply({ content: '❌ Failed to generate transcript.', ephemeral: true });
    }
}

// ─── Main Export ──────────────────────────────────────────────────────────────
module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {

        // ── Slash Commands ──────────────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const errEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setDescription('❌ An error occurred while executing this command!');
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
                } else {
                    await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
                }
            }
            return;
        }

        // ── Buttons ──────────────────────────────────────────────────────────
        if (interaction.isButton()) {
            const id = interaction.customId;

            // ── Ticket action buttons (inside the ticket channel)
            if (id === 'btn_close')      return closeTicket(interaction);
            if (id === 'btn_claim')      return claimTicket(interaction);
            if (id === 'btn_transcript') return sendTranscript(interaction);

            // ── Ticket creation buttons (panel buttons)
            const isTicketPanel = config.ticketButtons?.some(b => b.id === id) || id === 'create_ticket';
            if (!isTicketPanel) return;

            const categoryId   = config.ticketCategoryId;
            const supportRoleId = config.supportRoleId;

            // Already has a ticket?
            const existing = db.prepare('SELECT * FROM tickets WHERE userId = ? AND status = ?').get(interaction.user.id, 'open');
            if (existing) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.colors.error)
                        .setDescription((config.messages.alreadyHaveTicket || '❌ You already have a ticket: <#{channelId}>').replace('{channelId}', existing.channelId))
                    ],
                    ephemeral: true
                });
            }

            // Acknowledge immediately
            await interaction.reply({ content: config.messages.ticketCreating || '⏳ Creating your ticket...', ephemeral: true });

            try {
                const channel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: categoryId || null,
                    permissionOverwrites: [
                        { id: interaction.guild.id,  deny:  [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id,   allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                        { id: supportRoleId,          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    ],
                });

                db.prepare('INSERT INTO tickets (channelId, userId, status) VALUES (?, ?, ?)').run(channel.id, interaction.user.id, 'open');

                // Welcome embed inside the ticket
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`🎫 Ticket — ${interaction.user.username}`)
                    .setDescription(`Welcome ${interaction.user}!\nA staff member will be with you shortly.\n\n**Button Used:** \`${id}\``)
                    .setColor(config.ticketEmbed?.color || config.colors.primary)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await channel.send({
                    content: `${interaction.user} | <@&${supportRoleId}>`,
                    embeds: [welcomeEmbed],
                    components: [buildTicketActionRow()]
                });

                await interaction.editReply({
                    content: (config.messages.ticketCreatedSuccess || '✅ Ticket created: {channel}').replace('{channel}', channel.toString()),
                });

                // Log
                await sendLog(interaction.guild, new EmbedBuilder()
                    .setTitle(config.logEmbeds?.ticketCreatedTitle || '🎫 New Ticket Created')
                    .setColor(config.colors.primary)
                    .addFields(
                        { name: config.logEmbeds?.labels?.ticketName || 'Ticket',      value: `${channel}`,            inline: true },
                        { name: config.logEmbeds?.labels?.createdBy  || 'Created By',  value: interaction.user.tag,     inline: true },
                        { name: config.logEmbeds?.labels?.buttonUsed || 'Button Used', value: id,                      inline: true }
                    )
                    .setTimestamp()
                );

            } catch (error) {
                console.error('[TICKET CREATE ERROR]', error);
                await interaction.editReply({
                    content: config.messages.ticketCreationError || '❌ An error occurred while creating the ticket.',
                });
            }
        }
    },
};

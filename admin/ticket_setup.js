const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket_setup')
        .setDescription('Send the ticket panel in this channel (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Build the action row with ticket buttons
        const row = new ActionRowBuilder();

        if (config.ticketButtons && Array.isArray(config.ticketButtons) && config.ticketButtons.length > 0) {
            for (const btnConfig of config.ticketButtons) {
                const button = new ButtonBuilder()
                    .setCustomId(btnConfig.id)
                    .setLabel(btnConfig.label || 'Ticket')
                    .setStyle(ButtonStyle[btnConfig.style] || ButtonStyle.Secondary);
                if (btnConfig.emoji) button.setEmoji(btnConfig.emoji);
                row.addComponents(button);
            }
        } else {
            row.addComponents(
                new ButtonBuilder().setCustomId('create_ticket').setLabel('Open Ticket').setEmoji('📩').setStyle(ButtonStyle.Secondary)
            );
        }

        // Panel content: image + buttons only
        const panelImage = config.ticketPanelImage || config.ticketEmbed?.image || '';
        const panelText = config.ticketEmbed?.description || '';

        const messagePayload = { components: [row] };

        if (panelImage) {
            // Send as image embed (image only, no title/description junk)
            const imgEmbed = new EmbedBuilder()
                .setImage(panelImage)
                .setColor(config.colors.primary || '#8B0000');
            if (panelText) imgEmbed.setDescription(panelText);
            messagePayload.embeds = [imgEmbed];
        } else if (panelText) {
            messagePayload.content = panelText;
        }

        await interaction.channel.send(messagePayload);

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setDescription('✅ Ticket panel sent successfully.')
            ],
            ephemeral: true
        });
    },
};

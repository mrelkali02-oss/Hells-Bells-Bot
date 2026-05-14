const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Send a custom embed message to the current channel (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('embed_maker')
            .setTitle('Create Custom Embed');

        const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel("Title")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const descInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel("Color (Hex Code, e.g., #FF0000)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue('#8B0000');

        const imageInput = new TextInputBuilder()
            .setCustomId('embed_image')
            .setLabel("Image/GIF URL")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(colorInput),
            new ActionRowBuilder().addComponents(imageInput)
        );

        await interaction.showModal(modal);

        try {
            const submitted = await interaction.awaitModalSubmit({
                time: 300000, // 5 minutes to submit
                filter: i => i.user.id === interaction.user.id && i.customId === 'embed_maker',
            });

            if (submitted) {
                const title = submitted.fields.getTextInputValue('embed_title');
                const description = submitted.fields.getTextInputValue('embed_description');
                const color = submitted.fields.getTextInputValue('embed_color') || config.colors?.primary || '#8B0000';
                const image = submitted.fields.getTextInputValue('embed_image');

                const embed = new EmbedBuilder().setDescription(description);
                
                try { embed.setColor(color); } catch (e) { embed.setColor('#8B0000'); } // Fallback if invalid color
                if (title) embed.setTitle(title);
                try { if (image) embed.setImage(image); } catch (e) {} // Ignore if invalid URL

                await interaction.channel.send({ embeds: [embed] });
                await submitted.reply({ content: '✅ Embed sent successfully!', ephemeral: true });
            }
        } catch (error) {
            // Modal timeout or user closed it
        }
    },
};

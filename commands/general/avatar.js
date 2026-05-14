const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Display your avatar or another user's avatar")
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to show')),
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;

        const embed = new EmbedBuilder()
            .setTitle(config.profileEmbed?.avatarTitle ? config.profileEmbed.avatarTitle.replace('{user}', target.username) : `🖼️ ${target.username}'s Avatar`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setColor(config.colors.primary || 'Random');

        await interaction.reply({ embeds: [embed] });
    },
};

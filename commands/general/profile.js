const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Display your profile or another user's profile")
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to show')),
    async execute(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;

        const userData = db.prepare('SELECT points FROM points WHERE userId = ?').get(target.id);
        const points = userData ? userData.points : 0;
        
        const allUsers = db.prepare('SELECT * FROM points ORDER BY points DESC').all();
        const rankIndex = allUsers.findIndex(u => u.userId === target.id);
        const rank = rankIndex !== -1 ? `#${rankIndex + 1}` : (config.profileEmbed?.unranked || 'Unranked');

        const embed = new EmbedBuilder()
            .setTitle(config.profileEmbed?.profileTitle ? config.profileEmbed.profileTitle.replace('{user}', target.username) : `👤 ${target.username}'s Profile`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: config.profileEmbed?.profileLabels?.user || 'User', value: `${target}`, inline: true },
                { name: config.profileEmbed?.profileLabels?.points || '✨ Points', value: `**${points}**`, inline: true },
                { name: config.profileEmbed?.profileLabels?.rank || '🏆 Rank', value: `**${rank}**`, inline: true }
            )
            .setColor(config.colors.primary || 'Blue');

        await interaction.reply({ embeds: [embed] });
    },
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('Display the leaderboard of users with the most points'),
    async execute(interaction) {
        const topUsers = db.prepare('SELECT * FROM points ORDER BY points DESC LIMIT 10').all();

        if (topUsers.length === 0) {
            const errorEmbed = new EmbedBuilder().setColor(config.colors.warning || 'Yellow').setDescription(config.messages.leaderboardEmpty || 'Nobody is on the leaderboard yet.');
            return interaction.reply({ embeds: [errorEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(config.profileEmbed?.leaderboardTitle || '🏆 Leaderboard - Top Points')
            .setColor('#FFD700') // Gold
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

        let description = '';
        topUsers.forEach((user, index) => {
            let medal = '🏅';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            
            description += `${medal} **#${index + 1}** - <@${user.userId}> : **${user.points}** pts\n`;
        });

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed] });
    },
};

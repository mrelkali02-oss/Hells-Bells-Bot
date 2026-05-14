const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove_point')
        .setDescription('Remove points from a user (Admin only)')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Amount of points')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
            const errorEmbed = new EmbedBuilder().setColor(config.colors.error || 'Red').setDescription(config.messages.invalidAmount || '❌ Please enter an amount greater than 0');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        let userPoints = db.prepare('SELECT points FROM points WHERE userId = ?').get(target.id);
        
        if (!userPoints || userPoints.points < amount) {
            const errorEmbed = new EmbedBuilder().setColor(config.colors.error || 'Red').setDescription(config.messages.notEnoughPoints || '❌ This user does not have enough points to remove.');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        db.prepare('UPDATE points SET points = points - ? WHERE userId = ?').run(amount, target.id);

        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success || 'Green')
            .setDescription(config.messages.pointsRemoved ? config.messages.pointsRemoved.replace('{amount}', amount).replace('{user}', target.toString()) : `✅ Successfully removed **${amount}** points from ${target}.`);
            
        await interaction.reply({ embeds: [successEmbed] });
    },
};

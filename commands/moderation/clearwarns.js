const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarns')
        .setDescription('مسح جميع تحذيرات عضو معين')
        .addUserOption(o => o.setName('target').setDescription('العضو').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const had    = db.warns.clear(target.id);

        if (!had) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription(config.messages.warnNotFound || '❌ لم يتم العثور على أي تحذيرات لهذا العضو.')],
                ephemeral: true
            });
        }

        const msg = (config.messages.warnCleared || '✅ تم مسح جميع تحذيرات {user}.').replace('{user}', target.tag);
        await interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(msg)]
        });
    }
};

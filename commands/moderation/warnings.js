const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('عرض قائمة تحذيرات عضو معين')
        .addUserOption(o => o.setName('target').setDescription('العضو').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const warns  = db.warns.get(target.id);

        if (!warns || warns.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setDescription((config.messages.noWarnings || '✅ لا يوجد لدى هذا العضو أي تحذيرات.'))
                ],
                ephemeral: true
            });
        }

        const list = warns.map((w, i) => {
            const date = new Date(w.date).toLocaleDateString('ar-SA');
            return `**${i + 1}.** ${w.reason} — *${date}*`;
        }).join('\n');

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle(`⚠️ تحذيرات ${target.tag}`)
                .setDescription(list)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `إجمالي التحذيرات: ${warns.length}` })
                .setTimestamp()
            ]
        });
    }
};

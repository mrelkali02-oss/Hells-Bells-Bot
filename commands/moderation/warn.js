const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('تحذير عضو في السيرفر')
        .addUserOption(o => o.setName('target').setDescription('العضو المراد تحذيره').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('سبب التحذير').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || config.messages.noReason;

        if (!target) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(config.messages.userNotFound)],
                ephemeral: true
            });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ لا يمكنك تحذير نفسك.')],
                ephemeral: true
            });
        }

        const total = db.warns.add(target.id, reason, interaction.user.id);

        const msg = (config.messages.warned || '⚠️ تم تحذير **{user}**.\n**السبب:** {reason}\n**إجمالي التحذيرات:** {total}')
            .replace('{user}', target.user.tag)
            .replace('{reason}', reason)
            .replace('{total}', total);

        await interaction.reply({
            embeds: [new EmbedBuilder().setColor(config.colors.warning).setDescription(msg)]
        });

        // Try to DM the warned user
        try {
            await target.user.send({
                embeds: [new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle(`⚠️ تحذير — ${interaction.guild.name}`)
                    .setDescription(`تلقيت تحذيراً في **${interaction.guild.name}**.\n**السبب:** ${reason}`)
                    .setTimestamp()
                ]
            });
        } catch (_) { /* User has DMs closed */ }

        // Log
        if (config.logChannelId) {
            const logCh = interaction.guild.channels.cache.get(config.logChannelId);
            if (logCh) {
                await logCh.send({
                    embeds: [new EmbedBuilder()
                        .setTitle(config.logEmbeds?.warnTitle || '⚠️ تحذير عضو')
                        .setColor(config.colors.warning)
                        .addFields(
                            { name: config.logEmbeds?.labels?.target    || 'العضو',    value: `${target.user.tag} (${target.id})`, inline: true },
                            { name: config.logEmbeds?.labels?.moderator || 'المشرف',   value: interaction.user.tag,                inline: true },
                            { name: config.logEmbeds?.labels?.reason    || 'السبب',    value: reason,                              inline: false },
                            { name: 'إجمالي التحذيرات', value: `${total}`,             inline: true }
                        )
                        .setTimestamp()
                    ]
                }).catch(console.error);
            }
        }
    }
};

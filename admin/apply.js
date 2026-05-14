const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Manage the application status for the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('on')
                .setDescription('Open applications — announce that recruitment is open'))
        .addSubcommand(sub =>
            sub.setName('off')
                .setDescription('Close applications — announce that recruitment is closed')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const isOpen = sub === 'on';

        // ── Build announcement embed ────────────────────────────────────────
        const embed = new EmbedBuilder()
            .setColor(isOpen ? config.colors.success : config.colors.error)
            .setTitle(isOpen ? '✅ Applications Are Now Open!' : '🔒 Applications Are Now Closed!')
            .setDescription(
                isOpen
                    ? 'Recruitment is **open**! Head to the ticket channel and submit your application.'
                    : 'Recruitment is **closed**. We are not accepting new applications at this time.\nCheck back later!'
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: `Managed by ${interaction.user.tag}` });

        // ── Send to the apply status channel ───────────────────────────────
        const channelId = config.applyStatusChannelId;

        if (!channelId || channelId === 'PUT_APPLY_STATUS_CHANNEL_ID_HERE') {
            // No channel configured — just reply and warn
            await interaction.reply({
                embeds: [
                    embed,
                    new EmbedBuilder()
                        .setColor(config.colors.warning)
                        .setDescription('⚠️ `applyStatusChannelId` is not set in `config.json`. The announcement was not sent to any channel.')
                ],
                ephemeral: false
            });
            return;
        }

        const target = interaction.guild.channels.cache.get(channelId);

        if (!target) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Could not find the apply status channel. Check `applyStatusChannelId` in config.')],
                ephemeral: true
            });
        }

        await target.send({ embeds: [embed] });

        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ Application status set to **${isOpen ? 'OPEN 🟢' : 'CLOSED 🔴'}** — announcement sent to ${target}.`)
            ],
            ephemeral: true
        });
    },
};

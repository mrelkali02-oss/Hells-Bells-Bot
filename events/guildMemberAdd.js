const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        // Auto-Role System
        if (config.autoRoleId && config.autoRoleId !== "PUT_AUTO_ROLE_ID_HERE") {
            try {
                const role = member.guild.roles.cache.get(config.autoRoleId);
                if (role) {
                    await member.roles.add(role);
                }
            } catch (error) {
                console.error('[AUTO-ROLE ERROR]', error);
            }
        }

        // Welcome Message System
        if (config.welcomeChannelId && config.welcomeChannelId !== "PUT_WELCOME_CHANNEL_ID_HERE") {
            try {
                const channel = member.guild.channels.cache.get(config.welcomeChannelId);
                if (channel) {
                    const title = config.welcomeEmbed?.title 
                        ? config.welcomeEmbed.title.replace('{guild}', member.guild.name) 
                        : `👋 Welcome to ${member.guild.name}!`;
                        
                    const description = config.welcomeEmbed?.description
                        ? config.welcomeEmbed.description.replace('{user}', member.toString()).replace('{memberCount}', member.guild.memberCount)
                        : `We're glad to have you here, ${member}!\nYou are member #${member.guild.memberCount}.`;

                    const embed = new EmbedBuilder()
                        .setTitle(title)
                        .setDescription(description)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setColor(config.welcomeEmbed?.color || config.colors.primary || '#5865F2')
                        .setImage(config.welcomeEmbed?.image || 'https://i.imgur.com/8QG46mK.gif')
                        .setTimestamp();

                    await channel.send({ content: `${member}`, embeds: [embed] });
                }
            } catch (error) {
                console.error('[WELCOME ERROR]', error);
            }
        }
    },
};

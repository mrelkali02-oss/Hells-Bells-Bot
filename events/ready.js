const { Events } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const config = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[نجاح] البوت متصل الآن كـ ${client.user.tag}`);

        // Join the joinToCreate voice channel on startup (AFK presence)
        if (config.joinToCreateChannelId && config.joinToCreateChannelId !== 'PUT_JOIN_TO_CREATE_VOICE_CHANNEL_ID_HERE') {
            try {
                const guild = client.guilds.cache.get(config.guildId);
                if (!guild) return;

                const channel = guild.channels.cache.get(config.joinToCreateChannelId);
                if (!channel || channel.type !== 2) return; // type 2 = GuildVoice

                joinVoiceChannel({
                    channelId: channel.id,
                    guildId:   guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: true,
                });

                console.log(`[Voice] Joined voice channel: ${channel.name}`);
            } catch (err) {
                console.error('[Voice] Could not join voice channel:', err.message);
            }
        }
    },
};

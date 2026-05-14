const { Events, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../config.json');

// Store temporary voice channels in a Set to track them
const tempChannels = new Set();

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const joinToCreateId = config.joinToCreateChannelId;
        const categoryId = config.joinToCreateCategoryId;

        // Skip if feature is not configured
        if (!joinToCreateId || joinToCreateId === "PUT_JOIN_TO_CREATE_VOICE_CHANNEL_ID_HERE") return;

        // User Joins a Voice Channel
        if (newState.channelId === joinToCreateId) {
            try {
                const guild = newState.guild;
                const member = newState.member;

                // Create a new voice channel
                const newChannel = await guild.channels.create({
                    name: `${member.user.username}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: categoryId && categoryId !== "PUT_CATEGORY_ID_FOR_VOICE_CHANNELS_HERE" ? categoryId : newState.channel?.parentId,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            allow: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: member.user.id,
                            allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageRoles], // Give creator manage perms
                        }
                    ],
                });

                // Move the user to the newly created channel
                await member.voice.setChannel(newChannel);

                // Add to our tracker
                tempChannels.add(newChannel.id);
            } catch (error) {
                console.error('[VoiceStateUpdate] Error creating/moving user:', error);
            }
        }

        // User Leaves a Voice Channel
        if (oldState.channelId && oldState.channelId !== newState.channelId) {
            const oldChannel = oldState.channel;
            
            // Check if it's one of our temp channels and if it's empty
            if (oldChannel && tempChannels.has(oldChannel.id) && oldChannel.members.size === 0) {
                try {
                    await oldChannel.delete();
                    tempChannels.delete(oldChannel.id);
                } catch (error) {
                    console.error('[VoiceStateUpdate] Error deleting empty channel:', error);
                }
            }
        }
    },
};

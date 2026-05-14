const { Events } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bots
        if (message.author.bot) return;

        const ar = config.autoReply;
        if (!ar || !ar.triggerWord || !ar.response) return;

        // Check if the message contains the trigger word (case-insensitive)
        if (!message.content.toLowerCase().includes(ar.triggerWord.toLowerCase())) return;

        // Check if the user has the allowed role
        const allowedRoleId = ar.allowedRoleId || config.supportRoleId;
        if (!message.member?.roles.cache.has(allowedRoleId)) return;

        // Delete the original message if configured
        if (ar.deleteOriginalMessage) {
            await message.delete().catch(() => {});
        }

        // Send the response
        await message.channel.send(ar.response).catch(console.error);
    },
};

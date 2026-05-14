require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

client.commands = new Collection();

// تحميل الأوامر
const foldersPath = path.join(__dirname, 'commands');
// Ensure the folders exist or will be handled if not yet created.
if (fs.existsSync(foldersPath)) {
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[تحذير] الأمر في ${filePath} ينقصه الخاصية "data" أو "execute".`);
            }
        }
    }
}

// تحميل الأحداث
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// Anti-Crash System
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[ANTI-CRASH] Uncaught Exception:', err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception Monitor:', err, origin);
});

client.login(process.env.TOKEN);

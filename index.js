// Require the necessary classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const loadCommands = require('./loadCommands');

// Get the token from the .env file
const token = process.env.DISCORD_TOKEN;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.

// Load commamnd handlers from the 'commands' directory
client.commands = new Collection();

for (const command of loadCommands()) {
    client.commands.set(command.data.name, command);
}

// Load event handlers from the 'events' directory
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
        console.log(`[INFO] Loaded event: ${event.name} (once)`);
    } else {
        client.on(event.name, (...args) => event.execute(...args));
        console.log(`[INFO] Loaded event: ${event.name}`);
    }
}

// Log in to Discord with your client's token
client.login(token);
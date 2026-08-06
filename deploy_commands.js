const { REST, Routes } = require('discord.js');
const loadCommands = require('./loadCommands');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = loadCommands().map(command => command.data.toJSON());

const rest = new REST().setToken(token);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
    } catch (error) {
        console.error(error);
    }
})();

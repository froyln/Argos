const fs = require('node:fs');
const path = require('node:path');

function loadCommands() {
    const commands = [];
    const dir = path.join(__dirname, 'commands');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
        const command = require(path.join(dir, file));
        if ('data' in command && 'execute' in command) {
            commands.push(command);
            console.log(`[INFO] Loaded command: ${command.data.name}`);
        } else {
            console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`);
        }
    }
    return commands;
}

module.exports = loadCommands;

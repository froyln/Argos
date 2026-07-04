const { Events } = require('discord.js');
const { checkHoneypotChannelWithGuildId, registerBan, getAllRegisteredServers } = require('../database'); 
const { checkImageSpam } = require('../utils/ImageSpam');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const honeypotData = checkHoneypotChannelWithGuildId(message.guild.id);

        // honeypot channel's
        if (honeypotData && honeypotData.channel_id === message.channel.id) {
            try {
                await message.delete().catch(() => null);

                registerBan(message.guild.id, message.author.id, message.author.username);

                const servers = getAllRegisteredServers();

                for (const server of servers) {
                    try {
                        const guild = await message.client.guilds.fetch(server.guild_id).catch(() => null);
                        if (!guild) continue;

                        await guild.members.ban(message.author.id, {
                            reason: 'Triggered the honeypot.',
                            deleteMessageSeconds: 86400
                        });

                        console.log(`[HONEYPOT] User ${message.author.tag} (${message.author.id}) got banned in ${guild.name}.`);
                    } catch {
                        console.log(`[SKIP] User ${message.author.tag} (${message.author.id}) can't be banned in server ID: ${server.guild_id}.`);
                    }
                }
            } catch (error) {
                console.error(`[ERROR] Failed ban on ${message.author.tag} in ${message.guild.name}:`, error);
            }
            return; 
        }

        // check image spam
        await checkImageSpam(message);
    },
};
const { Events } = require('discord.js');
const { checkHoneypotChannelWithGuildId, registerBan, getAllRegisteredServers, getImageSpamSettings } = require('../database'); 
const { checkImageSpam, purgeUserMessages } = require('../utils/ImageSpam');

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

                        if (server.action === 'ban') {
                            await guild.members.ban(message.author.id, {
                                reason: 'Triggered the honeypot.',
                                deleteMessageSeconds: 86400
                            });
                            console.log(`[HONEYPOT] User ${message.author.tag} (${message.author.id}) got banned in ${guild.name}.`);
                        } else {
                            const member = await guild.members.fetch(message.author.id).catch(() => null);
                            if (member?.kickable) {
                                await member.kick('Triggered the honeypot.');
                                await purgeUserMessages(guild, message.author, false, 24 * 60 * 60 * 1000);
                                console.log(`[HONEYPOT] User ${message.author.tag} (${message.author.id}) got kicked in ${guild.name}.`);
                            } else {
                                console.log(`[SKIP] User ${message.author.tag} (${message.author.id}) can't be kicked in server ID: ${server.guild_id}.`);
                            }
                        }
                    } catch {
                        console.log(`[SKIP] User ${message.author.tag} (${message.author.id}) can't be actioned in server ID: ${server.guild_id}.`);
                    }
                }
            } catch (error) {
                console.error(`[ERROR] Failed honeypot action on ${message.author.tag} in ${message.guild.name}:`, error);
            }
            return; 
        }

        // check image spam
        const imageSpamSettings = getImageSpamSettings(message.guild.id);
        if (imageSpamSettings.enabled) {
            await checkImageSpam(message, imageSpamSettings);
        }
    },
};
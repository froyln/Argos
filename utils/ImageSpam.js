const { PermissionsBitField, EmbedBuilder } = require('discord.js');

// Memory cache: GuildID -> UserID -> Array<{ channelId, timestamp, signature }>
const imageHistory = new Map();
const punishingUsers = new Set();

/**
 * Generate lightweight signatures based on file size and name.
 */
function getAttachmentSignatures(attachments) {
    return attachments
        .filter(att => att.contentType && att.contentType.startsWith('image/'))
        .map(att => `${att.size}_${att.name}`);
}

/**
 * Delete recent messages from the user across all channels and send a notification embed.
 */
async function purgeUserMessages(guild, user) {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const textChannels = guild.channels.cache.filter(c => c.isTextBased());

    for (const [_, channel] of textChannels) {
        try {
            const botPermissions = channel.permissionsFor(guild.members.me);
            if (!botPermissions || !botPermissions.has(PermissionsBitField.Flags.ManageMessages)) continue;

            const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
            if (!messages) continue;

            const toDelete = messages.filter(
                msg => msg.author.id === user.id && msg.createdTimestamp >= thirtyMinutesAgo
            );

            if (toDelete.size > 0) {
                await channel.bulkDelete(toDelete, true).catch(() => null);

                // Send notification embed if permissions allow
                if (botPermissions.has([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.EmbedLinks])) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle('Spam Protection Triggered')
                        .setDescription(`Messages from <@${user.id}> were removed due to multi-channel image spam.`)
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(() => null);
                }
            }
        } catch (error) {
            console.error(`[ANTI-SPAM ERROR] Failed message purge in channel ${channel.id}:`, error.message);
        }
    }
}

/**
 * Check if the same image is sent across 3 or more channels within 30 seconds.
 */
async function checkImageSpam(message) {
    if (message.attachments.size === 0) return;
    const signatures = getAttachmentSignatures(message.attachments);
    if (signatures.length === 0) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const channelId = message.channel.id;
    const now = Date.now();

    const punishKey = `${guildId}_${userId}`;
    if (punishingUsers.has(punishKey)) return;

    if (!imageHistory.has(guildId)) imageHistory.set(guildId, new Map());
    const guildCache = imageHistory.get(guildId);
    if (!guildCache.has(userId)) guildCache.set(userId, []);

    let userRecords = guildCache.get(userId);
    // Discard records older than 30 seconds
    userRecords = userRecords.filter(record => (now - record.timestamp) <= 30000);

    for (const sig of signatures) {
        userRecords.push({ channelId, timestamp: now, signature: sig });
    }
    guildCache.set(userId, userRecords);

    for (const currentSig of signatures) {
        const channelsWithSameImage = new Set(
            userRecords
                .filter(record => record.signature === currentSig)
                .map(record => record.channelId)
        );

        // Trigger action if sent across 3 or more distinct channels
        if (channelsWithSameImage.size >= 3) {
            punishingUsers.add(punishKey);
            guildCache.delete(userId);

            try {
                const member = await message.guild.members.fetch(userId).catch(() => null);

                if (member && member.kickable) {
                    await member.kick('Triggered Image Spam Protection (Multi-channel flood).');
                    console.log(`[ANTI-SPAM] User ${message.author.tag} (${userId}) was kicked from ${message.guild.name}.`);
                } else {
                    console.log(`[SKIP ANTI-SPAM] User ${message.author.tag} (${userId}) can't be kicked in ${message.guild.name}.`);
                }

                // Pass the full author object to generate the embed correctly
                await purgeUserMessages(message.guild, message.author);
            } catch (error) {
                console.error(`[ANTI-SPAM ERROR] Failed action on ${message.author.tag} in ${message.guild.name}:`, error);
            } finally {
                setTimeout(() => punishingUsers.delete(punishKey), 5000);
            }
            break;
        }
    }
}

module.exports = { checkImageSpam };
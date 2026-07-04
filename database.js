const Database = require('better-sqlite3');

const dbPath = process.env.SQLITE_PATH || 'honeypots.db';
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

db.prepare(`
    CREATE TABLE IF NOT EXISTS servers (
        guild_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        message_json TEXT,
        message_id TEXT 
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY, 
        username TEXT NOT NULL,
        banned_status INTEGER NOT NULL DEFAULT 0,
        isAdmin INTEGER NOT NULL DEFAULT 0
    )
`).run();

// Your inmutable audit log table
db.prepare(`
    CREATE TABLE IF NOT EXISTS Bans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL, 
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        banned_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`).run();

const insertServer = db.prepare(`
    INSERT INTO servers (guild_id, channel_id) 
    VALUES (?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET 
        channel_id = excluded.channel_id
`);

const insertServerMessage = db.prepare(`
    UPDATE servers SET message_json = ?, message_id = ? WHERE guild_id = ?
`);

// Inserts every single ban event into the history log
const insertBanHistory = db.prepare(`
    INSERT INTO Bans (guild_id, user_id, username) 
    VALUES (?, ?, ?)
`);

// Updates or creates the user's current global ban status
const upsertUserStatus = db.prepare(`
    INSERT INTO users (user_id, username, banned_status) 
    VALUES (?, ?, 1)
    ON CONFLICT(user_id) DO UPDATE SET banned_status = 1
`);

const updateUserUnban = db.prepare(`
    UPDATE users SET banned_status = 0 WHERE user_id = ?
`);

const checkBanStatus = db.prepare(`
    SELECT banned_status FROM users WHERE user_id = ?
`);

const checkAdminStatus = db.prepare(`
    SELECT isAdmin FROM users WHERE user_id = ?
`);

const checkHoneypotChannel = db.prepare(`
    SELECT channel_id, message_id FROM servers WHERE guild_id = ?
`);

const getAllServers = db.prepare(`
    SELECT guild_id FROM servers
`);

const deleteServer = db.prepare(`
    DELETE FROM servers WHERE guild_id = ?
`);

function addHoneypot(guildId, channelId, userId) {
    // Discord IDs should always be passed as Strings
    if (checkAdminStatus.get(userId)?.isAdmin !== 1) {
        console.log(`[WARNING] Attempted to set a honeypot by a non-admin user: ${userId}. Action aborted.`);
        return false;
    }

    insertServer.run(guildId, channelId);
    return true;
}

function updateHoneypotMessage(guildId, messageJson, messageId, userId) {
    if (!checkHoneypotChannel.get(guildId)) {
        console.log(`[WARNING] Attempted to set a honeypot message for a guild without a honeypot channel: ${guildId}. Action aborted.`);
        return false;
    }

    // AHORA el userId sí existe y esto no lanzará error
    if (checkAdminStatus.get(userId)?.isAdmin !== 1) {
        console.log(`[WARNING] Attempted to set a honeypot message by a non-admin user: ${userId}. Action aborted.`);
        return false;
    }

    insertServerMessage.run(messageJson, messageId ? String(messageId) : null, guildId);
    return true;
}

function registerBan(guildId, userId, username) {
    if (checkAdminStatus.get(userId)?.isAdmin === 1) {
        console.log(`[WARNING] Attempted to ban an admin user: ${username} (${userId}). Action aborted.`);
        return false;
    }
    
    // 1. Save to the permanent history log (Will never be deleted)
    insertBanHistory.run(guildId, userId, username);
    
    // 2. Set current real-time status to Banned (1)
    upsertUserStatus.run(userId, username);
    return true; 
}

function removeBan(userId, userIdBanned) {
    if (checkAdminStatus.get(userId)?.isAdmin !== 1) {
        console.log(`[WARNING] Attempted to unban a user by a non-admin user: ${userId}. Action aborted.`);
        return false;
    }

    // Keeps the logs in 'Bans' intact, only flips the current status to Unbanned (0)
    updateUserUnban.run(userIdBanned);
}

function isBanned(userId) {
    const result = checkBanStatus.get(userId);
    return result ? result.banned_status === 1 : false;
}

function checkHoneypotChannelWithGuildId(guildId) {
    return checkHoneypotChannel.get(guildId);
}

function getAllRegisteredServers(){
    return getAllServers.all();
}

function removeHoneypot(guildId, userId) {
    if (checkAdminStatus.get(userId)?.isAdmin !== 1) {
        console.log(`[WARNING] Attempted to delete a honeypot by a non-admin user: ${userId}.`);
        return false;
    }

    const info = deleteServer.run(guildId);
    return info.changes > 0; 
}

function checkAdmin(userId){
    if (checkAdminStatus.get(userId)?.isAdmin !== 1) {
        console.log(`[WARNING] Attempted to delete a honeypot by a non-admin user: ${userId}.`);
        return false;
    }
    
    return true;
}

module.exports = {
    addHoneypot,
    updateHoneypotMessage,
    registerBan,
    removeBan,
    isBanned,
    checkHoneypotChannelWithGuildId,
    getAllRegisteredServers,
    removeHoneypot,
    checkAdmin
};
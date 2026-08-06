# Argos — AGENTS.md

Anti-spam/anti-raider Discord bot (honeypot). Node.js 20.6+ (uses `--env-file`), CommonJS, discord.js v14, better-sqlite3 (synchronous). No test or lint tooling exists.

## Commands
- `npm start` — run `index.js` (bot)
- `npm deploy` — run `deploy_commands.js` (register slash commands globally with Discord API)
- `docker compose up -d` — build + run, DB persisted at `./data/honeypots.db`

## Env vars (`.env`, gitignored)
- `DISCORD_TOKEN` — bot token (note: README says `TOKEN`, code uses `DISCORD_TOKEN`)
- `CLIENT_ID` — app ID for deploy
- `SQLITE_PATH` — optional DB path, defaults to `honeypots.db`

## Architecture
- `index.js` — entry point. Loads every `.js` in `commands/` (needs `data` + `execute`) and `events/` (needs `name` + `execute`, `once` flag honored). Logs in.
- `deploy_commands.js` — loads commands, PUTs them to `applicationCommands` (global scope).
- `database.js` — sole DB access layer; all prepared statements + wrapper functions. Synchronous better-sqlite3.
- `events/messageCreate.js` — core logic: messages in the configured honeypot channel → delete, log ban, then per target server run its configured action (`ban` → ban + delete 24h of messages, default `kick` → kick + purge 24h of messages) in **all** registered servers. Any other message → image-spam check (only if enabled in `image_spam_settings`).
- `utils/ImageSpam.js` — in-memory detector: same image signature (size+name) across ≥3 channels within 30s → kick + purge last 30 min of messages. Notification embed can be disabled per server. Cache is a module-level `Map`, lost on restart.

## Database (SQLite)
- `servers` — `guild_id` PK, `channel_id`, `message_json`, `message_id`, `action` (honeypot config + last posted bait message + `ban`/`kick`, default `kick`; column added via ALTER TABLE migration)
- `users` — `user_id` PK, `username`, `banned_status`, `isAdmin`
- `image_spam_settings` — `guild_id` PK, `enabled`, `announce` (both default 1; missing row = both ON)
- `Bans` — immutable audit log (`guild_id`, `user_id`, `username`, `banned_at`). Never deleted.

## Slash commands
| Command | Behavior |
|---|---|
| `honeypot_create <channel>` | Set honeypot channel. Requires `users.isAdmin = 1` in DB. |
| `honeypot_message` | Modal → message payload (raw text or JSON object e.g. `{"content": "...", "embeds": []}`). Sends/edits the bait message on Discord, stores it. |
| `honeypot_delete` | Modal → type "yes" to confirm removal. |
| `honeypot_unban <user_id>` | Global unban: removes ban from every registered server + flips `banned_status` to 0 (keeps `Bans` history). |
| `honeypot_action` | Set the honeypot action for the server (`ban` or `kick`, default `kick`). No arg = show current. Admin-only. |
| `imagespam` | Toggle image spam protection (`enabled`) and its notification embed (`announce`). No args = show current status. Admin-only. |

## Conventions & gotchas
- **Admin = DB field `users.isAdmin === 1`, not Discord permissions.** Grant admin by inserting directly into the DB. No command exists to do it.
- **Discord IDs are always strings** — pass/cast them as strings (`messageId ? String(messageId) : null`).
- Admin checks live in `database.js` wrapper functions; several also log a misleading warning ("Attempted to delete a honeypot...") even for non-delete operations.
- `registerBan` refuses to ban admins (no-op, logs warning).
- All replies are ephemeral via `MessageFlags.Ephemeral`; modals use `awaitModalSubmit` with `time` + error-code check for `InteractionCollectorError`.
- Bot requires Ban Members / Manage Messages / View Channel / Read-Send perms; bot role must outrank ban targets.
- Docker: `node:20-bullseye-slim`, installs python/make/g++ for better-sqlite3 build.

<div align="center">

# Argos

**Discord Honeypot Bot for multiple servers. Instantly bans accounts that fall into the `#honeypot` trap.**

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<img width="480" height="270" alt="image" src="https://github.com/user-attachments/assets/a16f457c-032e-4888-b279-9863bab68866" />

</div>

---

## What is it?

A Discord bot designed to act as a security honeypot for your servers. It silently monitors a designated `#honeypot` channel. Since legitimate users usually have no reason to type there, any account (whether a real user, a spammer, or an automated raider bot) that sends a message in this channel is automatically banned from the server. 

## Features

- **Multi-server support**: Protects several communities simultaneously and independently.
- **Zero-tolerance security**: Instantly bans the author of any message sent in the `#honeypot` channel.
- Local database integration for seamless data persistence.

## Requirements

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot application (see [Discord Developer Portal](https://discord.com/developers/applications))

## Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/froyln/Argos.git](https://github.com/froyln/Argos.git)
   cd Argos
2. Install dependencies:
   ```bash
   npm install
3. Create a .env file in the root directory with the following contents:
   ```bash
   TOKEN=your_bot_token_here
   CLIENT_ID=your_application_id_here

## Registering Slash Commands

Run the deployment script once (or whenever you modify the commands) to register them with the Discord API:
   ```bash
   node run deploy
   ```

## Starting the Bot

To boot up Argos, simply run:
   ```bash
   node run start
   ```

## Docker Compose

To run Argos using Docker Compose:

1. Make sure you have a `.env` file with your `TOKEN` and `CLIENT_ID` in the project root.
2. Run:
   ```bash
   docker compose up -d
   ```

This will build the image, start the bot, and persist the SQLite database in `./data/honeypots.db`.

Useful commands:
- `docker compose logs -f` — tail logs.
- `docker compose down` — stop the bot.
- `docker compose up -d --build` — rebuild after code changes.

## Usage
1. Invite Argos to your Discord server.
2. Ensure the bot has the following permissions: Ban Members, View Channels, and Read/Send Messages.
3. Crucial: Place the bot's role higher in the server hierarchy than the roles of the users it is supposed to ban.
4. Create a text channel named exactly #honeypot.
5. Tip: Set the #honeypot channel permissions so normal users can't see it or type in it, but leave it accessible enough for malicious API scrapers or raiders to find.
6. Argos is now watching. Anyone who sends a message in #honeypot will be banned immediately.

## Dependencies

[discord.js](https://discord.js.org/)

[dotenv](https://www.npmjs.com/package/dotenv)

## License

[MIT](LICENSE) © froyln

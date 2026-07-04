FROM node:20-bullseye-slim

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies required by better-sqlite3
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 \
       make \
       g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package definition and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Use production mode
ENV NODE_ENV=production

# Start the bot
CMD ["node", "index.js"]

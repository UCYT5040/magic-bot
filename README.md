# Magic Bot

Basic Discord bot with various features.

## Quickstart

1. Clone the repository
2. Set enviroment variables:

    ```bash
    DISCORD_CLIENT_ID= # Your Discord application client ID
    DISCORD_DEVELOPMENT_SERVER_ID= # ID to a Discord server for testing
    DISCORD_TOKEN= # Your Discord bot token
    DATABASE_URL=file:./dev.db # Prisma database URL (you can leave as is)
    ```

3. Install dependencies:

    ```bash
    npm install
    ```

4. Deploy commands (run once):

    ```bash
    npm run deploy-commands
    ```

5. Start the bot:

    ```bash
    npm run start
    ```

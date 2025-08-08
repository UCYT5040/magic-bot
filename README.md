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

## Features

Commands are implemented as Discord slash commands.

- `/get_admin` - When `ENABLE_GET_ADMIN` environment variable is set `true`, this command grants admin permissions to the user who invoked it. Do not use this in production!
- `/status` - Get the bot's status
- `/config` (admin) - Configure the bot's settings
- `/embed` (admin) - Create an embed message
- `/invites` Check how many users a member has invited to the server.
- `/invites_leaderboard` - Get the leaderboard of users with the most invites.
- `/slowmode` (mod) - Set slowmode for a channel.
- Starboard w/ optional auto reactions
- `/generate` - Generate AI images with various models.
- `/combine` - AI command to combine two objects.
- `/level` - View your level (or another user's)
- `/set_xp` / `/interpol_xp` (admin) - Set XP requirements for levels

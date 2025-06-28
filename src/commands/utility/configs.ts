import {SlashCommandBuilder} from "discord.js";
import {ConfigSession} from "../../config";
import {loadStarboardConfig, saveStarboardConfig, starboardConfigParts} from "../../configs/starboard";

const configs = {
    "starboard": ["Starboard", (guildId: string) => {
        const session = new ConfigSession("Starboard Configuration", guildId, loadStarboardConfig, saveStarboardConfig);
        session.parts = [...starboardConfigParts];
        return session;
    }]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config")
        .setDescription("Manage the bot's configuration.")
        .addStringOption(option =>
            option.setName("config")
                .setDescription("The configuration to manage.")
                .setRequired(true)
                .addChoices(
                    ...Object.entries(configs).map(([key, [label]]) => ({
                        name: label,
                        value: key
                    }))
                )
        ),

    async execute(interaction) {
        const configKey = interaction.options.getString("config");
        const configEntry = configs[configKey];
        if (!configEntry) {
            await interaction.reply({ content: "Unknown configuration.", ephemeral: true });
            return;
        }
        const [label, sessionBuilder] = configEntry;
        if (typeof sessionBuilder !== "function") {
            await interaction.reply({ content: "Configuration not implemented yet.", ephemeral: true });
            return;
        }
        const session = (sessionBuilder as (guildId: string) => ConfigSession)(interaction.guildId);
        await session.send(interaction);
    }
};

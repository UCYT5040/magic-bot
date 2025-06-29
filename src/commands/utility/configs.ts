import {MessageFlagsBitField, PermissionsBitField, SlashCommandBuilder} from "discord.js";
import {ConfigSession} from "../../config";
import {loadStarboardConfig, saveStarboardConfig, starboardConfigParts} from "../../configs/starboard";
import { loadGuildConfig, saveGuildConfig, guildConfigParts } from "../../configs/guild";

const configs = {
    "guild": ["Guild", (guildId: string) => {
        const session = new ConfigSession("Guild Configuration", guildId, loadGuildConfig, saveGuildConfig);
        session.parts = [...session.parts, ...guildConfigParts];
        return session;
    }],
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
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        const configKey = interaction.options.getString("config");
        const configEntry = configs[configKey];
        if (!configEntry) {
            await interaction.reply({content: "Unknown configuration.", flags: [MessageFlagsBitField.Flags.Ephemeral]});
            return;
        }
        const [label, sessionBuilder] = configEntry;
        if (typeof sessionBuilder !== "function") {
            await interaction.reply({
                content: "Configuration not implemented yet.",
                flags: [MessageFlagsBitField.Flags.Ephemeral]
            });
            return;
        }
        const session = (sessionBuilder as (guildId: string) => ConfigSession)(interaction.guildId);
        await session.send(interaction);
    }
};

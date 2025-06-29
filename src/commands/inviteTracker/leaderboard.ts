import {MessageFlags, SlashCommandBuilder} from "discord.js";
import {embed} from "../../embed";
import {getGuildInvites} from "../../inviteTracker";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("invite_leaderboard")
        .setDescription("Returns the top invite counts for users in the server."),
    async execute(interaction) {
        let deferral = interaction.deferReply({
            flags: MessageFlags.SuppressEmbeds
        });
        let guildInvitesPromise = getGuildInvites(interaction.guildId, interaction.client); // [userId, inviteCount][]
        await Promise.all([deferral, guildInvitesPromise]);
        const guildInvites = await guildInvitesPromise;
        if (!guildInvites || guildInvites.length === 0) {
            await interaction.editReply({
                embeds: [
                    await embed(interaction.guildId)
                        .setTitle("No Invites Found")
                        .setDescription(`No invites found for this server.
If this is unexpected, data may still be processing.`)
                ]
            });
        } else {
            let list = "";
            // Grab top 10 users by invite count (data is already sorted by invite count)
            for (let i = 0; i < Math.min(10, guildInvites.length); i++) {
                const [userId, inviteCount] = guildInvites[i];
                list += `**${i + 1}.** <@${userId}> - ${inviteCount} invites\n`;
            }
            const leaderboardEmbed = (await embed(interaction.guildId))
                .setTitle("Invite Leaderboard")
                .setDescription("Top invite counts for users in this server:\n" + list.trim());
            await interaction.editReply({
                embeds: [leaderboardEmbed]
            });
        }
    }
};

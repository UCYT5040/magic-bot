import {Events, MessageFlags, MessageReaction, TextChannel} from "discord.js";
import {PrismaClient} from "../../../generated/prisma";
import {embed} from "../../embed";

const prisma = new PrismaClient();

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,
    execute(reaction: MessageReaction, client: any) {
        if (!reaction.message.guild || reaction.message.author.bot || !reaction.emoji.name) return;

        prisma.starboardConfig.findFirst({
            where: {
                channelId: reaction.message.channel.id,
                guildId: reaction.message.guild.id
            }
        }).then(config => {
            if (!config) return;

            if (reaction.emoji.name === config.reaction) {
                let starCount = reaction.count || 0;
                // Check if the bot reacted to the message
                let reacted = reaction.message.reactions.cache.get(config.reaction)?.me;
                if (reacted) starCount--; // Exclude the bot's reaction from the count
                if (starCount >= config.threshold) {
                    // Check if the message is already in the starboard
                    prisma.starboardMessage.findFirst({
                        where: {
                            messageId: reaction.message.id
                        }
                    }).then(existingMessage => {
                        if (!existingMessage) {
                            // Create a new starboard message
                            if (!config.postChannelId) {
                                console.error("Starboard post channel ID is not set.");
                                return;
                            }
                            reaction.client.channels.fetch(config.postChannelId).then(channel => {
                                let starboardMessageEmbed = createStarboardEmbed(reaction, starCount);
                                (channel as TextChannel).send({
                                    embeds: [starboardMessageEmbed],
                                    flags: MessageFlags.SuppressEmbeds
                                }).then(newMessage => {
                                    // Save the new starboard message to the database
                                    prisma.starboardMessage.create({
                                        data: {
                                            channelId: config.postChannelId,
                                            starboardConfigId: config.id,
                                            messageId: reaction.message.id,
                                            postedMessageId: newMessage.id,
                                            userId: reaction.message.author.id
                                        }
                                    }).then(() => {
                                        console.log("Starboard message created successfully.");
                                    }).catch(error => {
                                        console.error("Error sending starboard message:", error);
                                    });
                                });

                            });
                        } else {
                            // Update the existing starboard message
                            if (existingMessage.postedMessageId) {
                                reaction.client.channels.fetch(existingMessage.channelId).then(channel => {
                                    const starboardEmbed = createStarboardEmbed(reaction, starCount);
                                    (channel as TextChannel).messages.fetch(existingMessage.postedMessageId).then(msg => {
                                        msg.edit({embeds: [starboardEmbed]}).catch(error => {
                                            console.error("Error updating starboard message:", error);
                                        });
                                    }).catch(error => {
                                        console.error("Error fetching starboard message:", error);
                                    });
                                });
                            }
                        }
                    }).catch(error => {
                        console.error("Error checking existing starboard message:", error);
                    });
                }
            }

        }).catch(error => {
            console.error("Error fetching starboard config:", error);
        });
    }
};

function createStarboardEmbed(reaction: MessageReaction, starCount: number) {
    return embed()
        .setTitle(`Starboard Message (${starCount} Stars)`)
        .setAuthor({
            name: reaction.message.author.username,
            iconURL: reaction.message.author.displayAvatarURL()
        })
        .setURL(reaction.message.url)
        .setDescription(reaction.message.content || "*No content*");
}

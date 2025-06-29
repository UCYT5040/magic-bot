import {Events, MessageFlags, MessageReaction, TextChannel} from "discord.js";
import {PrismaClient} from "../../../generated/prisma";
import {embed} from "../../embed";

const prisma = new PrismaClient();

module.exports = {
    name: Events.MessageReactionAdd,
    once: false,
    async execute(reaction: MessageReaction, client: any) {
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }
        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                return;
            }
        }

        if (!reaction.message.guild || !reaction.message.author || reaction.message.author.bot || !reaction.emoji.name) return;

        try {
            const config = await prisma.starboardConfig.findFirst({
                where: {
                    channelId: reaction.message.channel.id,
                    guildId: reaction.message.guild.id
                }
            });

            if (!config) return;

            if (reaction.emoji.name === config.reaction) {
                let starCount = reaction.count || 0;
                // Check if the bot reacted to the message
                const reacted = reaction.message.reactions.cache.get(config.reaction)?.me;
                if (reacted) starCount--; // Exclude the bot's reaction from the count

                if (starCount >= config.threshold) {
                    const existingMessage = await prisma.starboardMessage.findFirst({
                        where: {
                            messageId: reaction.message.id
                        }
                    });

                    if (!existingMessage) {
                        // Create a new starboard message
                        if (!config.postChannelId) {
                            console.error("Starboard post channel ID is not set.");
                            return;
                        }

                        try {
                            const channel = await reaction.client.channels.fetch(config.postChannelId);
                            const starboardMessageEmbed = await createStarboardEmbed(reaction, starCount);
                            const newMessage = await (channel as TextChannel).send({
                                embeds: [starboardMessageEmbed],
                                flags: MessageFlags.SuppressEmbeds
                            });

                            await prisma.starboardMessage.create({
                                data: {
                                    channelId: config.postChannelId,
                                    starboardConfigId: config.id,
                                    messageId: reaction.message.id,
                                    postedMessageId: newMessage.id,
                                    userId: reaction.message.author.id
                                }
                            });
                            console.log("Starboard message created successfully.");
                        } catch (error) {
                            console.error("Error creating starboard message:", error);
                        }
                    } else {
                        // Update the existing starboard message
                        if (existingMessage.postedMessageId) {
                            try {
                                const channel = await reaction.client.channels.fetch(existingMessage.channelId);
                                const msg = await (channel as TextChannel).messages.fetch(existingMessage.postedMessageId);
                                const starboardEmbed = await createStarboardEmbed(reaction, starCount);
                                await msg.edit({embeds: [starboardEmbed]});
                            } catch (error) {
                                console.error("Error updating starboard message:", error);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error in messageReactionAdd event:", error);
        }
    }
};

async function createStarboardEmbed(reaction: MessageReaction, starCount: number, guildId?: string) {
    const e = await embed(guildId);
    if (!reaction.message.author) {
        throw new Error("Message author is null");
    }
    return e
        .setTitle(`Starboard Message (${starCount} Stars)`)
        .setAuthor({
            name: reaction.message.author.username,
            iconURL: reaction.message.author.displayAvatarURL()
        })
        .setURL(reaction.message.url)
        .setDescription(reaction.message.content || "*No content*");
}

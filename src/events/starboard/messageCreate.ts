import {Events, Message} from "discord.js";
import {PrismaClient} from "../../../generated/prisma";

const prisma = new PrismaClient();

module.exports = {
    name: Events.MessageCreate,
    once: false,
    execute(message: Message, client: any) {
        if (!message.guild || message.author.bot) return;

        prisma.starboardConfig.findFirst({
            where: {
                channelId: message.channel.id,
                guildId: message.guild.id
            }
        }).then(config => {
            if (!config) return;

            if (config.autoReact) {
                message.react(config.reaction).catch(error => {
                    console.error("Error reacting to message:", error);
                });
            }
        }).catch(error => {
            console.error("Error fetching starboard config:", error);
        });
    }
};

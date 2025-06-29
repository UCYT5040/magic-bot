import {EmbedBuilder} from "discord.js";
import {PrismaClient} from "../generated/prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COLOR = "#ff0040"; // Default embed color

export function embed(guildId?: string): EmbedBuilder {
    // Fetch guild configuration if available
    let color: string | undefined;
    if (guildId) {
        prisma.guildConfig.findUnique({ where: { guildId } })
            .then(config => {
                if (config && config.color) {
                    color = config.color;
                }
            });
    }
    return new EmbedBuilder()
        .setColor(color || DEFAULT_COLOR)
        .setTimestamp();
}
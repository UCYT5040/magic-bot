import {EmbedBuilder} from "discord.js";
import {PrismaClient} from "../generated/prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COLOR = "#ff0040"; // Default embed color

export async function embed(guildId?: string): Promise<EmbedBuilder> {
    // Fetch guild configuration if available
    let color: string | undefined;
    if (guildId) {
        try {
            const config = await prisma.guildConfig.findUnique({where: {guildId}});
            await prisma.guildConfig.findUnique({where: {guildId}})
            if (config && config.color) {
                color = config.color;
            }
        } catch (error) {
            console.error("Error fetching guild config:", error);
        }
    }
    return new EmbedBuilder()
        .setColor(color || DEFAULT_COLOR)
        .setTimestamp();
}
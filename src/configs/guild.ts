import {ConfigPart, InputConfigPart, SelectConfigPart} from "../config";
import {PrismaClient} from "../../generated/prisma";

const prisma = new PrismaClient();

export const guildConfigParts: ConfigPart[] = [
    new InputConfigPart(
        "color",
        "Embed Color",
        "The default color for embeds in this guild.",
        "#ff0040",
        "text"
    )
];

export async function loadGuildConfig(guildId: string) {
    return prisma.guildConfig.findFirst({where: {guildId}});
}

export async function saveGuildConfig(guildId: string, config: any) {
    const data: any = {};
    if (config.color) data.color = config.color;

    if (Object.keys(data).length === 0) return;

    const existing = await prisma.guildConfig.findFirst({where: {guildId}});
    if (existing) {
        return prisma.guildConfig.update({
            where: {id: existing.id},
            data
        });
    } else {
        return prisma.guildConfig.create({
            data: {
                ...data,
                guildId: guildId
            }
        });
    }
}

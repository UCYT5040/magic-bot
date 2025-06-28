import {ConfigPart, InputConfigPart, SelectConfigPart} from "../config";
import {PrismaClient} from "../../generated/prisma";

const prisma = new PrismaClient();

export const starboardConfigParts: ConfigPart[] = [
    new SelectConfigPart(
        "channelId",
        "Channel where messages can be starred",
        [], // Options will be channels in the guild, dynamically populated
        "channel",
        1, // min selections
        1, // max selections
        ["GUILD_TEXT"] // channelTypes
    ),
    new SelectConfigPart(
        "postChannelId",
        "Channel where starred messages are posted",
        [], // Options will be channels in the guild, dynamically populated
        "channel",
        1, // min selections
        1, // max selections
        ["GUILD_TEXT"] // channelTypes
    ),
    new InputConfigPart(
        "reaction",
        "Reaction used to star messages",
        "⭐ or <:emoji_name:123456789012345678> for custom emojis",
        "⭐",
        "text"
    ),
    new InputConfigPart(
        "threshold",
        "Stars needed to send a message to starboard",
        "#",
        10,
        "number"
    ),
    new SelectConfigPart(
        "starboardMode",
        "Starboard mode",
        [
            {label: "Stars only in configured channel(s)", value: "0"},
            {label: "Stars in any channel", value: "1"}
        ],
        "text", // Using text for now, as it represents a choice from predefined options
        1,
        1,
        undefined,
        "0"
    ),
    new SelectConfigPart(
        "autoReact",
        "Automatically react to messages in starred channels",
        [
            {label: "Yes", value: "true"},
            {label: "No", value: "false"}
        ],
        "boolean",
        1,
        1,
        undefined,
        "false"
    )
];


export async function loadStarboardConfig(guildId: string) {
    return prisma.starboardConfig.findFirst({where: {guildId}});
}

export async function saveStarboardConfig(guildId: string, config: any) {
    const data: any = {};
    if (config.channelId) data.channelId = config.channelId;
    if (config.postChannelId) data.postChannelId = config.postChannelId;
    if (config.reaction) data.reaction = config.reaction;
    if (config.threshold) data.threshold = parseInt(config.threshold, 10);
    if (config.starboardMode) data.starboardMode = parseInt(config.starboardMode, 10);
    if (config.autoReact) data.autoReact = config.autoReact === "true";

    if (Object.keys(data).length === 0) return;

    const existing = await prisma.starboardConfig.findFirst({where: {guildId}});
    if (existing) {
        return prisma.starboardConfig.update({
            where: {id: existing.id},
            data
        });
    } else {
        // Ensure all required fields are present for creation
        if (!data.channelId || !data.postChannelId || !data.reaction || !data.threshold) {
            console.error("Missing required fields for starboard config creation");
            return;
        }
        return prisma.starboardConfig.create({
            data: {
                ...data,
                guildId: guildId
            }
        });
    }
}
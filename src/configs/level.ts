import {ConfigPart, InputConfigPart, SelectConfigPart} from "../config";
import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

export const levelConfigParts: ConfigPart[] = [
    new SelectConfigPart(
        "enabled",
        "Enable or disable the leveling system",
        [
            {label: "Enabled", value: "true"},
            {label: "Disabled", value: "false"}
        ],
        "text"
    ),
    new InputConfigPart(
        "xpPerMessage",
        "XP given each time a user sends a message",
        "5",
        5,
        "number"
    ),
    new InputConfigPart(
        "messageCooldown",
        "Cooldown in seconds for XP gain from messages",
        "15s",
        15,
        "number"
    ),
    new InputConfigPart(
        "xpPerVoiceInterval",
        "XP for voice activity every interval",
        "5",
        5,
        "number"
    ),
    new InputConfigPart(
        "voiceInterval",
        "Time in seconds for XP from voice activity",
        "15s",
        15,
        "number"
    )
];


export async function loadLevelConfig(guildId: string) {
    return prisma.levelConfig.findFirst({where: {guildId}})
}

export async function saveLevelConfig(guildId: string, config: any) {
    const data: any = {};
    if (config.enabled) data.enabled = config.enabled === "true";
    if (config.xpPerMessage) data.xpPerMessage = parseInt(config.xpPerMessage);
    if (config.messageCooldown) data.messageCooldown = parseInt(config.messageCooldown);
    if (config.xpPerVoiceInterval) data.xpPerVoiceInterval = parseInt(config.xpPerVoiceInterval);
    if (config.voiceInterval) data.voiceInterval = parseInt(config.voiceInterval);

    if (Object.keys(data).length === 0) return;

    const existing = await prisma.levelConfig.findFirst({where: {guildId}});
    if (existing) {
        return prisma.levelConfig.update({
            where: {id: existing.id},
            data
        });
    } else {
        // Ensure all required fields are present for creation
        if (!data.xpPerMessage || !data.messageCooldown || !data.xpPerVoiceInterval || !data.voiceInterval) {
            console.error("Missing required fields for level config creation");
            return;
        }
        return prisma.levelConfig.create({
            data: {
                ...data,
                guildId: guildId
            }
        });
    }
}
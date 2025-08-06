import {PrismaClient} from '@prisma/client';

import {embed} from './embed';

const prisma = new PrismaClient();


export async function xpEvent(event: 'message' | 'voice', userId: string, guildId: string, channel) {
    let config;
    try {
        config = await prisma.levelConfig.findFirst({
            where: {
                guildId
            }
        });
    } catch (error) {
        console.error('Error fetching level config:', error);
    }

    if (!config || !config.enabled) return;

    let user;
    try {
        user = await prisma.levelUser.findFirst({
            where: {
                userId,
                levelConfigId: config.id
            }
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
    }

    let xp = event === 'message' ? config.xpPerMessage : config.xpPerVoiceInterval;
    let level = 0;

    if (user) {
        if (event == 'message' &&
            Date.now() - user.lastMessage.getTime() < config.messageCooldown * 1000) {
            console.log('Message cooldown active for user:', userId);
            console.log('Difference:', user.lastMessage.getTime() - Date.now(), 'ms');
            console.log('Cooldown duration:', config.messageCooldown * 1000, 'ms');
            return;
        }
        if (event == 'voice' &&
            Date.now() - user.lastVoice.getTime() < config.voiceInterval * 1000) {
            console.log('Voice cooldown active for user:', userId);
            return;
        }
        xp += user.xp;
        level = user.level;
    }

    let nextLevel = level + 1;
    while (1) {
        let level = await prisma.levelAmount.findFirst({
            where: {
                level: nextLevel,
                levelConfigId: config.id
            },
            select: {
                xpRequired: true
            }
        });
        if (!level) break;
        if (xp < level.xpRequired) break;
        nextLevel++;
        xp -= level.xpRequired;
    }

    let newLevel = nextLevel - 1;

    // Send a level up message
    if (newLevel > level) {
        try {
            await channel.send({
                embeds: [
                    (await embed(guildId)).setTitle(`Level Up!`).setDescription(`Congratulations <@${userId}>! You have reached level **${newLevel}**!`)
                ]
            });
        } catch (error) {
            console.error('Error sending level up message:', error);
        }
    }

    if (user) {
        try {
            await prisma.levelUser.update({
                where: {
                    id: user.id
                },
                data: {
                    xp: xp,
                    level: newLevel,
                    lastMessage: event === 'message' ? new Date() : user.lastMessage,
                    lastVoice: event === 'voice' ? new Date() : user.lastVoice
                }
            });
        } catch (error) {
            console.error('Error updating user data:', error);
        }
    } else {
        try {
            await prisma.levelUser.create({
                data: {
                    userId,
                    levelConfigId: config.id,
                    xp: xp,
                    level: newLevel,
                    lastMessage: event === 'message' ? new Date() : new Date(0),
                    lastVoice: event === 'voice' ? new Date() : new Date(0)
                }
            });

        } catch (error) {
            console.error('Error creating user data:', error);
        }
    }
}
import {Events} from 'discord.js';
import {PrismaClient} from '@prisma/client';
import {voiceIntervals} from '../../index';
import {xpEvent} from '../../level';

const prisma = new PrismaClient();

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState, newState, client) {
        console.log('VOICE STATE UPDATE');
        const userId = newState.id;
        const guildId = newState.guild.id;

        // If the user joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            if (newState.member?.user.bot) return;

            const levelConfig = await prisma.levelConfig.findFirst({
                where: {
                    guildId: guildId
                }
            });
            if (!levelConfig || !levelConfig.enabled) return;
            const intervalDuration = levelConfig.voiceInterval * 1000; // Convert seconds to milliseconds

            const addXp = () => {
                xpEvent('voice', userId, guildId, newState.channel);
            };

            // Start the interval and store its ID in the map
            const interval = setInterval(addXp, intervalDuration);
            voiceIntervals.set(userId, interval);
        }

        // If the user left the voice channel
        if (oldState.channelId && !newState.channelId) {
            // Check if there's an active interval for this user
            if (voiceIntervals.has(userId)) {
                // Clear the interval and remove it from the map
                clearInterval(voiceIntervals.get(userId)!);
                voiceIntervals.delete(userId);
            }
        }
    }
};
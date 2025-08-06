import {Events, Message} from 'discord.js';
import {xpEvent} from '../../level';


module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message: Message, client: any) {
        if (!message.guild || message.author.bot) return;
        await xpEvent('message', message.author.id, message.guild.id, message.channel);
    }
};

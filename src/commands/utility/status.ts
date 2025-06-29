import {SlashCommandBuilder} from "discord.js";
import {embed} from "../../embed";

const statusData = {
    ping: ['Ping', 'ms'],
    uptime: ['Uptime', 's'],
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Returns various status information about the bot.'),
    async execute(interaction) {
        console.log('Pong!')
        const ping = interaction.client.ws.ping
        const data = {
            ping: ping == -1 ? '(unknown)' : ping,
            uptime: Math.floor(interaction.client.uptime / 1000),
        }
        let messageBody = '';
        for (const [key, value] of Object.entries(statusData)) {
            const [label, unit] = value;
            messageBody += `**${label}:** ${data[key]} ${unit}\n`;
        }
        const statusEmbed = (await embed(interaction.guildId)).setTitle('Status Information').setDescription(messageBody);
        await interaction.reply({
            embeds: [statusEmbed]
        });
    },
};
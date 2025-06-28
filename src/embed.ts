import {EmbedBuilder} from "discord.js";

export function embed() {
    return new EmbedBuilder()
        .setColor("#ff0040") // TODO: Make configurable
        .setTimestamp();
}
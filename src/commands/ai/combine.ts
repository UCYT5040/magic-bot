import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { embed } from "../../embed";


const API_ENDPOINT = "https://stablehorde.net/api/v2/"
const API_KEY = "0000000000"
const ACCEPTABLE_MODELS = [
    "koboldcpp/Qwen3-30B-A3B",
    "koboldcpp/google_gemma-3-1b-it-Q4_K_M"
]
const PROMPT = `Given two items, combine them into a single item. Be creative!
If there is some cultural reference possible, use it!
---
bread + butter = buttered bread
water + flour = quesadilla
wolf + cat = ocelot
red + blue = purple
superhero + villain = antihero
a + b = c
1 + 2 = 3
cobblestone + stick = stone pickaxe
big + red dog = clifford the big red dog
`

interface Model {
    performance: number,
    queued: number,
    jobs: number,
    eta: number,
    type: "image" | "text",
    name: string,
    count: number
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName("combine")
        .setDescription("Combines two items into a single item using AI.")
        .addStringOption(option =>
            option.setName("item1")
                .setDescription("The first item to combine")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("item2")
                .setDescription("The second item to combine")
                .setRequired(true)
        ),
    async execute(interaction) {
        let item1 = interaction.options.getString("item1", true);
        let item2 = interaction.options.getString("item2", true);

        item1 = item1.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
        item2 = item2.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");

        await interaction.deferReply();

        let prompt = PROMPT + `${item1} + ${item2} = `;

        const response = await fetch(API_ENDPOINT + "generate/text/async", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": API_KEY
            },
            body: JSON.stringify({
                prompt,
                params: {
                    models: ACCEPTABLE_MODELS
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to generate image: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }


        await interaction.editReply({
            embeds: [
                (await embed(interaction.guildId))
                    .setTitle("Generating...")
                    .setDescription(`Mixing **${item1}** and **${item2}**...\nI'll keep you updated.`)
            ]
        });

        const jobId = data.id;

        while (true) {
            const jobResponse = await fetch(API_ENDPOINT + `generate/text/status/${jobId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": API_KEY
                }
            });

            if (!jobResponse.ok) {
                throw new Error(`Failed to check job status: ${jobResponse.statusText}`);
            }

            const jobData = await jobResponse.json();
            if (jobData.done) {
                if (jobData.error) {
                    return await interaction.reply({
                        content: `Error generating image: ${jobData.error}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                const result = jobData.generations[0].text.split("\n")[0].trim();
                return await interaction.editReply({
                    embeds: [
                        (await embed(interaction.guildId))
                            .setTitle("Combination Complete")
                            .setDescription(`The combination of **${item1}** and **${item2}** is:\n**${result}**`)
                    ]
                });
            } else {
                await interaction.editReply({
                    embeds: [
                        (await embed(interaction.guildId))
                            .setTitle("Generating...")
                            .setDescription(`Mixing **${item1}** and **${item2}**...\n**Queue position:** ${jobData.queue_position}\n**ETA:** ${jobData.wait_time} seconds`)
                    ]
                });
            }

            // Wait before checking again
            const waitTime = Math.min(jobData.wait_time * 1000, 2500); // Limit to 2.5 seconds
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

    }
};

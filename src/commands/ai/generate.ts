import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { embed } from "../../embed";


const API_ENDPOINT = "https://stablehorde.net/api/v2/"
const API_KEY = "0000000000"

interface Model {
    performance: number,
    queued: number,
    jobs: number,
    eta: number,
    type: "image" | "text",
    name: string,
    count: number
}

let modelDataCache: Model[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60; // 1 minute

async function getModelData() {
    const currentTime = Date.now();
    if (modelDataCache && (currentTime - lastFetchTime < CACHE_DURATION)) {
        return modelDataCache;
    }
    // Fetch new model data
    let response = await fetch(
        API_ENDPOINT + "status/models?" + new URLSearchParams({
            "type": "image",
            "min_count": "2",
            "model_state": "known"
        }),
        {
            method: "GET"
        }
    )
    if (!response.ok) {
        throw new Error(`Failed to fetch model data: ${response.statusText}`);
    }
    modelDataCache = await response.json() as Model[];
    lastFetchTime = currentTime;
    return modelDataCache;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName("generate")
        .setDescription("Generates an image using AI.")
        .addStringOption(option =>
            option.setName("prompt")
                .setDescription("The prompt to generate the image from")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("model")
                .setDescription("The AI model to use for image generation")
                .setRequired(false)
                .setAutocomplete(true)
        ),
    async autocomplete(interaction) {
        let focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === "model") {
            try {
                const models = await getModelData();
                const choices = models.map(model => ({
                    name: `${model.name} (${model.performance})`,
                    value: model.name
                }));
                const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
                await interaction.respond(filtered.slice(0, 25));
            } catch (error) {
                console.error("Error fetching model data:", error);
                await interaction.respond([]);
            }
        }
    },
    async execute(interaction) {
        const prompt = interaction.options.getString("prompt", true);
        const model = interaction.options.getString("model") || "stable_diffusion_2.1";

        await interaction.deferReply();

        const models = await getModelData();
        if (!models.some(m => m.name === model)) {
            return await interaction.reply({
                content: `Model "${model}" not found. Available models: ${models.map(m => m.name).join(", ")}`,
                flags: MessageFlags.Ephemeral
            });
        }

        const response = await fetch(API_ENDPOINT + "generate/async", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": API_KEY
            },
            body: JSON.stringify({
                prompt,
                params: {
                    censor_nsfw: true,
                    models: [
                        model
                    ]
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
                await embed(interaction.guildId)
                    .setTitle("Generating Image")
                    .setDescription("Your image is being generated.\nI'll keep you updated.")
            ]
        });

        const jobId = data.id;

        while (true) {
            const jobResponse = await fetch(API_ENDPOINT + `generate/check/${jobId}`, {
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
                const statusRequest = await fetch(API_ENDPOINT + `generate/status/${jobId}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": API_KEY
                    }
                });
                if (!statusRequest.ok) {
                    throw new Error(`Failed to get job status: ${statusRequest.statusText}`);
                }
                const jobData = await statusRequest.json();
                if (jobData.error) {
                    return await interaction.reply({
                        content: `Error generating image: ${jobData.error}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                const imageUrl = jobData.generations[0].img;
                return await interaction.editReply({
                    embeds: [
                        await embed(interaction.guildId)
                            .setTitle("Image Generated")
                            .setDescription(`Your image has been generated successfully!`)
                            .setImage(imageUrl)
                            .setFooter({
                                text: `Model: ${jobData.generations[0].model}`
                            })
                    ]
                });
            } else {
                // Update the reply with the current status
                await interaction.editReply({
                    embeds: [
                        await embed(interaction.guildId)
                            .setTitle("Generating Image")
                            .setDescription(`Your image is being generated.\n**Queue position:** ${jobData.queue_position}\n**ETA:** ${jobData.wait_time} seconds`)
                    ]
                });
            }

            // Wait before checking again
            const waitTime = Math.min(jobData.wait_time * 1000, 2500); // Limit to 2.5 seconds
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

    }
};

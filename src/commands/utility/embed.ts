import {
    ActionRowBuilder,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { embed } from "../../embed";
import { PrismaClient } from "../../../generated/prisma/client";

const prisma = new PrismaClient();

function createFieldModal(i: number) {
    const randomId = Math.random().toString(36).substring(2, 15); // Generate a random ID for the modal
    return [randomId, new ModalBuilder()
        .setTitle(`Embed Field ${i + 1} Details`)
        .setCustomId(`embedFieldDetails-${randomId}`)
        .addComponents([
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(`embedFieldName-${randomId}`)
                    .setLabel("Field Name")
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(`embedFieldValue-${randomId}`)
                    .setLabel("Field Value")
                    .setStyle(TextInputStyle.Paragraph)
            )
        ])];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Creates a basic embed (opens a modal)")
        .addNumberOption(option =>
            option.setName("fields")
                .setDescription("The number of additional fields to include in the embed (0-25).")
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(25)
        ),
    async execute(interaction) {
        const fieldsCount = interaction.options.getNumber("fields") || 0;
        const randomId = Math.random().toString(36).substring(2, 15);
        // Get guild config to see if a color is set
        const guildConfig = await prisma.guildConfig.findUnique({
            where: {
                guildId: interaction.guildId
            }
        });
        let color;
        if (!guildConfig || !guildConfig.color) {
            color = "#ff0040"; // Default color if not set
        } else {
            color = guildConfig.color;
        }
        const embedDetailsModal = new ModalBuilder()
            .setTitle("Embed Details")
            .setCustomId(`embedDetails-${randomId}`)
            .addComponents([
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(`embedTitle-${randomId}`)
                        .setLabel("Embed Title")
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(`embedDescription-${randomId}`)
                        .setLabel("Embed Description")
                        .setStyle(TextInputStyle.Paragraph)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(`embedColor-${randomId}`)
                        .setLabel("Embed Color")
                        .setStyle(TextInputStyle.Short)
                        .setValue(color)
                        .setPlaceholder(`Hex color code (e.g., ${color})`)
                )
            ]);
        await interaction.showModal(embedDetailsModal);
        const filter = (i) => i.customId.startsWith(`embedDetails-${randomId}`) && i.user.id === interaction.user.id;
        const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
        const embedTitle = modalInteraction.fields.getTextInputValue(`embedTitle-${randomId}`);
        const embedDescription = modalInteraction.fields.getTextInputValue(`embedDescription-${randomId}`);
        const embedColor = modalInteraction.fields.getTextInputValue(`embedColor-${randomId}`);
        const embedFields = [];
        let latestInteraction = modalInteraction;
        for (let i = 0; i < fieldsCount; i++) {
            // Discord doesn't allow back-to-back modals, so use a button to renew the context
            const nextButtonId = `nextFieldModal-${randomId}-${i}`;
            await latestInteraction.reply({
                content: `Ready to enter details for field ${i + 1}. Click the button below to continue.`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new (require('discord.js').ButtonBuilder)()
                            .setCustomId(nextButtonId)
                            .setLabel('Next')
                            .setStyle(require('discord.js').ButtonStyle.Primary)
                    )
                ],
                ephemeral: true
            });
            // Wait for button interaction
            const buttonFilter = (btnInt) => btnInt.customId === nextButtonId && btnInt.user.id === interaction.user.id;
            const buttonInteraction = await latestInteraction.channel.awaitMessageComponent({ filter: buttonFilter, time: 60000 });
            // Show the next modal using the button interaction
            const [fieldId, fieldModal] = createFieldModal(i);
            await buttonInteraction.showModal(fieldModal);
            const fieldFilter = (i) => i.customId.startsWith(`embedFieldDetails-${fieldId}`) && i.user.id === interaction.user.id;
            const fieldInteraction = await buttonInteraction.awaitModalSubmit({ filter: fieldFilter, time: 60000 });
            const fieldName = fieldInteraction.fields.getTextInputValue(`embedFieldName-${fieldId}`);
            const fieldValue = fieldInteraction.fields.getTextInputValue(`embedFieldValue-${fieldId}`);
            embedFields.push({ name: fieldName, value: fieldValue });
            latestInteraction = fieldInteraction;
        }
        const embedColorHex = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(embedColor) ? embedColor : color;
        const embedMessage = (await embed(interaction.guildId))
            .setTitle(embedTitle || "No Title")
            .setDescription(embedDescription || "No Description")
            .setColor(embedColorHex)
            .addFields(embedFields);
        await latestInteraction.reply({
            embeds: [embedMessage]
        });
    }
}

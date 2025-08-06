import {
    ActionRowBuilder,
    ModalActionRowComponentBuilder,
    ModalBuilder, PermissionsBitField,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { embed } from "../../embed";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("set_xp")
        .setDescription("Set the amount of XP needed to achieve a level")
        .addNumberOption(option =>
            option.setName("level")
                .setDescription("The level to set the XP for")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000)
        )
        .addNumberOption(option =>
            option.setName("xp")
                .setDescription("The amount of XP required to achieve this level")
                .setRequired(true)
                .setMinValue(0)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const level = interaction.options.getNumber("level");
        const xp = interaction.options.getNumber("xp");

        const levelConfig = await prisma.levelConfig.findFirst({
            where: {
                guildId: interaction.guild.id
            }
        });

        if (!levelConfig || !levelConfig.enabled) {
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle("Level Info")
                    .setDescription("Leveling is not enabled in this server.")
                ]
            });
            return;
        }

        // Check for an existing LevelAmount
        const existingLevelAmount = await prisma.levelAmount.findFirst({
            where: {
                levelConfigId: levelConfig.id,
                level: level
            }
        });

        if (existingLevelAmount) {
            // Update existing LevelAmount
            await prisma.levelAmount.update({
                where: {
                    id: existingLevelAmount.id
                },
                data: {
                    xpRequired: xp
                }
            });
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle("Level XP Updated")
                    .setDescription(`The XP required for level ${level} has been updated to ${xp}.`)
                ]
            });
        } else {
            // Create new LevelAmount
            await prisma.levelAmount.create({
                data: {
                    levelConfigId: levelConfig.id,
                    level: level,
                    xpRequired: xp
                }
            });
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle("Level XP Set")
                    .setDescription(`The XP required for level ${level} has been set to ${xp}.`)
                ]
            });
        }
    }
}

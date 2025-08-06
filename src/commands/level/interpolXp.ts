import {PermissionsBitField, SlashCommandBuilder, TextInputStyle} from "discord.js";
import {embed} from "../../embed";
import {PrismaClient} from "@prisma/client";
import {interpol} from "../../interpol";

const prisma = new PrismaClient();

async function setOrUpdateLevelAmount(levelConfigId, level, xp) {
    const existingLevelAmount = await prisma.levelAmount.findFirst({
        where: {
            levelConfigId: levelConfigId,
            level: level
        }
    });

    if (existingLevelAmount) {
        return prisma.levelAmount.update({
            where: {
                id: existingLevelAmount.id
            },
            data: {
                xpRequired: xp
            }
        });
    } else {
        return prisma.levelAmount.create({
            data: {
                levelConfigId: levelConfigId,
                level: level,
                xpRequired: xp
            }
        });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("interpol_xp")
        .setDescription("Interpolate multiple XP values for levels")
        .addNumberOption(option =>
            option.setName("level1")
                .setDescription("The first level to set the XP for")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(999)
        )
        .addNumberOption(option =>
            option.setName("xp1")
                .setDescription("The amount of XP for the first level")
                .setRequired(true)
                .setMinValue(0)
        )
        .addNumberOption(option =>
            option.setName("level2")
                .setDescription("The second level to set the XP for")
                .setRequired(true)
                .setMinValue(2)
                .setMaxValue(1000)
        )
        .addNumberOption(option =>
            option.setName("xp2")
                .setDescription("The amount of XP for the second level")
                .setRequired(true)
                .setMinValue(0)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const level1 = interaction.options.getNumber("level1");
        const xp1 = interaction.options.getNumber("xp1");
        const level2 = interaction.options.getNumber("level2");
        const xp2 = interaction.options.getNumber("xp2");

        if (level1 >= level2) {
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle("Invalid Levels")
                    .setDescription("The first level must be less than the second level.")
                ]
            });
            return;
        }

        const xpValues = interpol([{
            level: level1,
            xp: xp1
        }, {
            level: level2,
            xp: xp2
        }]);

        console.log(xpValues);

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

        const promises = xpValues.map(pair =>
            setOrUpdateLevelAmount(levelConfig.id, pair.level, pair.xp)
        );

        try {
            await Promise.all(promises);
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle("XP Interpolation Success")
                    .setDescription(`XP values for levels ${level1} to ${level2} have been successfully interpolated and saved.`)
                    .addFields([
                            {
                                name: "Interpolated Levels",
                                value: xpValues.map(pair => `Level ${pair.level}: ${pair.xp} XP`).join("\n")
                            }
                        ]
                    )
                ]
            });
        } catch (error) {
            console.error("Error saving interpolated XP values:", error);
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle("Error")
                    .setDescription("An error occurred while saving the interpolated XP values.")
                ]
            });
        }
    }
};

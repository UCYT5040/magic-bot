import {AttachmentBuilder, SlashCommandBuilder, TextInputStyle} from 'discord.js';
import {embed} from '../../embed';
import {PrismaClient} from '@prisma/client';
import nodeHtmlToImage from 'node-html-to-image';

const prisma = new PrismaClient();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your level or the level of another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mention in the embed')
                .setRequired(false)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;

        const levelConfig = await prisma.levelConfig.findFirst({
            where: {
                guildId: interaction.guild.id
            }
        });

        if (!levelConfig || !levelConfig.enabled) {
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle('Level Info')
                    .setDescription('Leveling is not enabled in this server.')
                ]
            });
            return;
        }

        // Fetch user level data
        const levelData = await prisma.levelUser.findFirst({
            where: {
                userId: user.id,
                levelConfigId: levelConfig.id
            }
        });

        if (!levelData) {
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle('Level Info')
                    .setDescription('No level data found for this user.')
                ]
            });
            return;
        }

        const nextLevelData = await prisma.levelAmount.findFirst({
            where: {
                level: levelData.level + 1,
                levelConfigId: levelConfig.id
            },
            select: {
                xpRequired: true
            }
        });

        if (!nextLevelData) {
            await interaction.reply({
                embeds: [(await embed(interaction.guildId))
                    .setTitle('Level Info')
                    .setDescription('No data found for the next level.')
                ]
            });
            return;
        }

        // Calculate user rank
        const userRank = await prisma.levelUser.count({
            where: {
                levelConfigId: levelConfig.id,
                OR: [
                    {level: {gt: levelData.level}},
                    {level: levelData.level, xp: {gt: levelData.xp}}
                ]
            }
        }) + 1;

        await interaction.deferReply();

        // Open rank.html
        const fs = require('fs');

        const html = fs.readFileSync('rank.html', 'utf8');

        const data = {
            username: user.username,
            avatarURL: user.displayAvatarURL({size: 512, extension: 'png'}),
            // For presence, get user from guild cache
            statusClass: `status-${interaction.guild.members.cache.get(user.id)?.presence?.status || 'offline'}`,
            rank: userRank,
            level: levelData.level,
            currentXP: levelData.xp,
            requiredXP: nextLevelData.xpRequired,
            xpPercentage: ((levelData.xp / nextLevelData.xpRequired) * 100).toFixed(2)
        };

        const image = (await nodeHtmlToImage({
            html,
            content: data,
            transparent: true
        })) as Buffer<ArrayBufferLike>;

        const attachment = new AttachmentBuilder(
            Buffer.from(image.buffer),
            {name: 'rank.png'});

        // Send the image
        await interaction.editReply({
            files: [
                attachment
            ]
        });
    }
};

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Use the exact environment link or default to your verified Vercel site
const VERCEL_URL = process.env.CLIENT_URL || "https://near-verify-web.vercel.app/";

client.once('ready', () => {
    console.log(`🌲 ForestNEARian Bot is live, clean, and tracking!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!setup') {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔐 NFT Wallet Verification')
            .setDescription('Click the button below to link your NEAR wallet and unlock your exclusive holder role!');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Verify Wallet')
                    .setURL(VERCEL_URL)
                    .setStyle(ButtonStyle.Link)
            );

        await message.reply({ embeds: [embed], components: [row] });
    }
});

// Explicitly use the environment token Render looks for
client.login(process.env.DISCORD_TOKEN);

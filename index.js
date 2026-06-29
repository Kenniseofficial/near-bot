const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Make sure this is imported at the top
const app = express();

// Paste this exact block right here:
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
const app = express();
const PORT = process.env.PORT || 3000;

// Render Health Check Route
app.get('/', (req, res) => {
    res.send('ForestNEARian Bot Web Server is Online');
});

app.listen(PORT, () => {
    console.log(`📡 Web server listening on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

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

client.login(process.env.DISCORD_TOKEN);

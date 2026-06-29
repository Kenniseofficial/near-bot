const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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
// --- THE MISSING VERIFY ROUTE ---
app.post('/verify', async (req, res) => {
  console.log("📨 Incoming verification payload received:", req.body);

  const userId = req.body.userId || req.body.discordId;
  const accountId = req.body.accountId || req.body.walletAddress;
  const hasNft = req.body.hasNft;

  if (!userId || !accountId) {
    console.log("❌ Missing user data in request body.");
    return res.status(400).json({ error: "Missing userId or accountId" });
  }

  // Early activity log check
  if (hasNft === false) {
    console.log(`📡 Log Ping: User ${userId} is currently checking wallet ${accountId}`);
    return res.json({ status: "logged" });
  }

  try {
    console.log(`ℹ️ Attempting to assign role to User ID: ${userId}`);
    
    // Target your specific Discord Server Guild
    const guildId = "1265975298130935858"; // Replace with your true Server Guild ID if different
    const roleId = "1265976543163940864";  // Replace with your true Verified Role ID if different

    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    
    await member.roles.add(roleId);

    console.log(`✅ Success! Role assigned to Discord User: ${userId}`);
    return res.json({ success: true });
  } catch (error) {
    console.error("❌ Discord Role Assignment failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

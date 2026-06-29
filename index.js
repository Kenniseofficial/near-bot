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
// --- STARTUP LOG: Shows how many servers the bot is connected to ---
client.once('ready', () => {
  console.log(`=============================================`);
  console.log(`🌲 ${client.user.tag} is live and tracking!`);
  console.log(`📊 Connected to: ${client.guilds.cache.size} server(s)`);
  client.guilds.cache.forEach(guild => {
    console.log(`   • ${guild.name} (ID: ${guild.id})`);
  });
  console.log(`=============================================`);
});

// --- ENHANCED VERIFY ROUTE ---
app.post('/verify', async (req, res) => {
  console.log("Incoming verification payload received:", req.body);

  const userId = req.body.userId || req.body.discordId;
  const accountId = req.body.accountId || req.body.walletAddress;
  const hasNft = req.body.hasNft;

  if (!userId || !accountId) {
    return res.status(400).json({ error: "Missing userId or accountId" });
  }

  // Handle accidental username input instead of a numerical ID
  if (isNaN(userId)) {
    console.log(`❌ Validation Failed: '${userId}' is a username, not a valid numeric Discord ID.`);
    return res.status(400).json({ error: "Please provide your numerical Discord User ID, not your username." });
  }

  if (hasNft === false) {
    console.log(`📡 Log Ping: User ${userId} is checking wallet ${accountId}`);
    return res.json({ status: "logged" });
  }

  try {
    const guildId = "1265975298130935858"; 
    const roleId = "1265976543163940864";  

    // 1. Attempt to fetch the Guild safely
    let guild;
    try {
      guild = await client.guilds.fetch(guildId);
    } catch (gError) {
      console.error(`❌ Guild Error: Bot cannot find Guild ID ${guildId}. Ensure the ID is correct and the bot is invited.`);
      return res.status(500).json({ error: "Bot configurations error: Server not found." });
    }

    // 2. Check if the user is sitting in the server
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (mError) {
      console.log(`❌ Membership Check: User ID ${userId} is NOT a member of this server.`);
      return res.status(404).json({ error: "You must join our Discord server before verifying your wallet!" });
    }
    
    console.log(`👤 Target User Verified: ${member.user.tag}`);
    console.log(`👑 Is User Server Owner?: ${guild.ownerId === member.id}`);

    // 3. Assign role
    await member.roles.add(roleId);
    console.log(`✅ Success! Role assigned to Discord User: ${userId}`);
    return res.json({ success: true });

  } catch (error) {
    console.error("❌ Discord Role Assignment failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

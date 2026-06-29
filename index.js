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

// 1. Put the ready listener FIRST so it's armed and ready to catch the event
client.once('ready', () => {
  console.log(`=============================================`);
  console.log(`🌲 ${client.user.tag} is live and tracking!`);
  console.log(`📊 Connected to: ${client.guilds.cache.size} server(s)`);
  client.guilds.cache.forEach(guild => {
    console.log(`   • ${guild.name} (ID: ${guild.id})`);
  });
  console.log(`=============================================`);
});

// 2. Put the login action AFTER the listener is set up
client.login(process.env.DISCORD_TOKEN);

// --- ENHANCED VERIFY ROUTE ---
app.post('/verify', async (req, res) => {
  console.log("Incoming verification payload received:", req.body);// --- DYNAMIC MULTI-SERVER VERIFY ROUTE ---
app.post('/verify', async (req, res) => {
  console.log("📨 Incoming verification payload received:", req.body);

  const userId = req.body.userId || req.body.discordId;
  const accountId = req.body.accountId || req.body.walletAddress;
  const hasNft = req.body.hasNft;

  if (!userId || !accountId) {
    return res.status(400).json({ error: "Missing userId or accountId" });
  }

  if (isNaN(userId)) {
    console.log(`❌ Validation Failed: '${userId}' is a username, not a numeric ID.`);
    return res.status(400).json({ error: "Please provide your numerical Discord User ID." });
  }

  if (hasNft === false) {
    console.log(`📡 Log Ping: User ${userId} is checking wallet ${accountId}`);
    return res.json({ status: "logged" });
  }

  // Common role name to search for across all servers
  const TARGET_ROLE_NAME = "ForestNEARian"; 

  try {
    let targetGuild = null;
    let targetMember = null;

    // Get all servers the bot is currently in
    const connectedGuilds = client.guilds.cache.values();

    // Loop through servers to find where this user is sitting
    for (const guild of connectedGuilds) {
      try {
        const member = await guild.members.fetch(userId);
        if (member) {
          targetGuild = guild;
          targetMember = member;
          console.log(`🔍 Found user inside server: ${guild.name} (ID: ${guild.id})`);
          break; // Stop looking once we find the matching server membership
        }
      } catch (err) {
        // User isn't in this server, continue checking the next one
        continue;
      }
    }

    // If we scanned all servers and didn't find the user
    if (!targetGuild || !targetMember) {
      console.log(`❌ Membership Check: User ID ${userId} is not found in any server the bot is in.`);
      return res.status(404).json({ error: "You must join the Discord server before verifying!" });
    }

    // Find the role dynamically by its name inside that specific server
    const role = targetGuild.roles.cache.find(r => r.name === TARGET_ROLE_NAME);

    if (!role) {
      console.log(`❌ Role Error: Could not find a role named '${TARGET_ROLE_NAME}' in ${targetGuild.name}.`);
      return res.status(404).json({ error: `The server needs a role named exactly '${TARGET_ROLE_NAME}'.` });
    }

    // Assign the found role
    await targetMember.roles.add(role);
    console.log(`✅ Success! '${TARGET_ROLE_NAME}' role assigned to ${targetMember.user.tag} in ${targetGuild.name}`);
    return res.json({ success: true });

  } catch (error) {
    console.error("❌ Discord Dynamic Role Assignment failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

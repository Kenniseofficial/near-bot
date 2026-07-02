const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const express = require('express');
const cors = require('cors'); // Make sure this is imported at the top
const cron = require('node-cron');
const app = express();

// --- SUPABASE DATABASE CONFIGURATION ---
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
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
console.log(`📑 dropped verification card in server: ${message.guild?.name || 'Unknown Server'}`);
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
  console.log(`🌲 ${client.user.tag} is live and tracking!`);
  console.log(`📊 Connected to: ${client.guilds.cache.size} server(s)`);
  client.guilds.cache.forEach(guild => {
    console.log(`   • ${guild.name} (ID: ${guild.id})`);
  });
});

// 2. Put the login action AFTER the listener is set up
client.login(process.env.DISCORD_TOKEN);
// --- AUTOMATED HOLDINGS VALIDATION ENGINE ---
async function scanAndSyncNftHolders() {
  console.log("🔄 Starting scheduled 5-minute audit of NFT holders...");

  try {
    const { data: verifiedUsers, error } = await supabase
      .from('verifications')
      .select('user_id, account_id');

    if (error) {
      console.error("❌ Failed to fetch records from Supabase during scan:", error);
      return;
    }

    if (!verifiedUsers || verifiedUsers.length === 0) {
      console.log("ℹ️ No verified users found in the database to audit.");
      return;
    }

    console.log(`📡 Auditing ${verifiedUsers.length} active records sequentially...`);

    for (const user of verifiedUsers) {
      const discordId = user.user_id;
      const walletAddress = user.account_id;

      try {
        const argsBase64 = Buffer.from(JSON.stringify({ account_id: walletAddress })).toString('base64');

        const rpcResponse = await fetch('https://rpc.mainnet.near.org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'dontcare',
            method: 'query',
            params: {
              request_type: 'call_function',
              finality: 'final',
              account_id: 'ofp_collection.nfts.tg',
              method_name: 'nft_supply_for_owner',
              args_base64: argsBase64
            }
          })
        });

        const rpcData = await rpcResponse.json();
        let count = 0;

        if (rpcData.result && rpcData.result.result) {
          const bytesToText = String.fromCharCode(...rpcData.result.result);
          const balanceString = bytesToText.replace(/['"]+/g, '');
          count = parseInt(balanceString, 10);
        }

        if (isNaN(count) || count === 0) {
          console.log(`⚠️ Liquidation Detected: User ${discordId} (${walletAddress}) holds 0 NFTs.`);

          for (const guild of client.guilds.cache.values()) {
            try {
              const member = await guild.members.fetch(discordId).catch(() => null);
              if (member) {
                const TARGET_ROLE_NAME = "ForestNEARian";
                const role = guild.roles.cache.find(r => r.name === TARGET_ROLE_NAME);
                const targetChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'));

                if (role && member.roles.cache.has(role.id)) {
                  await member.roles.remove(role);
                  console.log(`🛡️ Stripped role from ${member.user.tag}`);
                }

                await member.kick("Automated Security Sync: NFT holdings sold/transferred.");
                console.log(`🚪 Kicked user ${member.user.tag} from server.`);

                if (targetChannel) {
                  const alertEmbed = new EmbedBuilder()
                    .setColor('#ff3333')
                    .setTitle('🛡️ Security System: Access Revoked')
                    .setDescription(`**User:** <@${discordId}>\n**Wallet:** \`${walletAddress}\`\n\nThis user has been removed from the server because they sold or transferred their **ForestNEARian** NFT holdings.`)
                    .setTimestamp();

                  await targetChannel.send({ embeds: [alertEmbed] }).catch(err => console.error(err));
                }
              }
            } catch (guildErr) {
              continue;
            }
          }

          await supabase
            .from('verifications')
            .delete()
            .eq('user_id', discordId);
          console.log(`🧹 Cleaned up validation table entry for user ${discordId}.`);
        }
      } catch (chainError) {
        console.error(`❌ RPC connection failure checking wallet ${walletAddress}:`, chainError);
      }
    }
    console.log("✅ Scheduled automated security scan completed cleanly.");
  } catch (globalError) {
    console.error("❌ Critical error running holder verification loop:", globalError);
  }
}

// --- INITIALIZE INTERVAL (RUNS ONCE EVERY 5 MINUTES) ---
cron.schedule('*/5 * * * *', () => {
  scanAndSyncNftHolders();
});
// --- ENHANCED VERIFY ROUTE WITH SUPABASE ---
app.post('/verify', async (req, res) => {
  console.log("Incoming verification payload received:", req.body);
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

  try {
    // 1. Check Supabase to see if this Discord ID or NEAR Wallet already exists
    const { data: existingRecords, error: fetchError } = await supabase
      .from('verifications')
      .select('user_id, account_id')
      .or(`user_id.eq.${userId},account_id.eq.${accountId}`);

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return res.status(500).json({ error: "Database verification check failed." });
    }

    if (existingRecords && existingRecords.length > 0) {
      const matchedId = existingRecords.some(r => r.user_id === String(userId));
      const matchedWallet = existingRecords.some(r => r.account_id === String(accountId));

      if (matchedId && matchedWallet) {
        console.log(`❌ Blocked: Credentials verified already (User: ${userId}, Wallet: ${accountId})`);
        return res.status(400).json({ error: "credentials verified already" });
      }
      if (matchedId) {
        console.log(`❌ Blocked: ID verified already (User: ${userId})`);
        return res.status(400).json({ error: "ID verified already" });
      }
      if (matchedWallet) {
        console.log(`❌ Blocked: Wallet address verified already (Wallet: ${accountId})`);
        return res.status(400).json({ error: "wallet address verified already" });
      }
    }

    // 2. If the user doesn't own the NFT, stop here but log the check step cleanly
    if (hasNft === false) {
      console.log(`📡 Log Ping: User ${userId} is checking wallet ${accountId}`);
      return res.json({ status: "logged" });
    }

    const TARGET_ROLE_NAME = "ForestNEARian";
    let targetGuild = null;
    let targetMember = null;

    const connectedGuilds = client.guilds.cache.values();

    for (const guild of connectedGuilds) {
      try {
        const member = await guild.members.fetch(userId);
        if (member) {
          targetGuild = guild;
          targetMember = member;
          console.log(`🔍 Found user inside server: ${guild.name} (ID: ${guild.id})`);
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (!targetGuild || !targetMember) {
      console.log(`❌ Membership Check: User ID ${userId} is not found in any server.`);
      return res.status(404).json({ error: "You must join the Discord server before verifying!" });
    }

    const role = targetGuild.roles.cache.find(r => r.name === TARGET_ROLE_NAME);

    if (!role) {
      console.log(`❌ Role Error: Could not find a role named '${TARGET_ROLE_NAME}'`);
      return res.status(404).json({ error: `The server needs a role named exactly '${TARGET_ROLE_NAME}'` });
    }

    // 3. Assign the Discord Role
    await targetMember.roles.add(role);
    console.log(`✅ Success! '${TARGET_ROLE_NAME}' role assigned to ${targetMember.user.tag}`);

    // 4. Save to Supabase to permanently prevent reusing these credentials
    const { error: insertError } = await supabase
      .from('verifications')
      .insert([{ user_id: String(userId), account_id: String(accountId) }]);

    if (insertError) {
      console.error("Supabase storage saving error:", insertError);
      // We don't crash here since the role was successfully assigned, but we log it.
    }

    return res.json({ success: true });

  } catch (error) {
    console.error("❌ Discord Dynamic Role Assignment failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

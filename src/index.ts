import dotenv from "dotenv";
dotenv.config();
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  OmitPartialGroupDMChannel,
  Partials,
  ChannelType,
  AttachmentBuilder
} from "discord.js";

import generateResponse from "./lib/fetch/internal";
import cleanAIResponse from "./lib/utils/cleanResponse";
import generateAPIResponse from "./lib/fetch/external";
import sendPaginatedReply from "./lib/utils/sendPaginatedReply";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [ Partials.Channel ] 
});

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});


client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    // Если это сообщение в канале (не DM) и нет упоминания бота — игнорируем
    if (
      message.channel.type !== ChannelType.DM &&
      !message.mentions.has(message.client.user!)
    ) {
      return;
    }

    await message.channel.sendTyping();

    if (process.env.ONLY_LOCAL === 'true') {
      return await localFetch(null, message);
    } else {
      console.log('Skipping only local...');
    }

    const result = await generateAPIResponse('deepseek-chat', message.content);
    if (!result) return;

    const fullReply = Array.isArray(result) ? result.join('\n') : result;

    // Split into chunks of 2000 characters and send each
    for (let i = 0; i < fullReply.length; i += 2000) {
      const chunk = fullReply.slice(i, i + 2000);
      const sent = await message.reply(cleanAIResponse(chunk));
    }

  } catch (err: any) {
    console.error(`Error using API: ${err.message}`);
    await localFetch(null, message);
  }
});

// Local fetch fallback
async function localFetch(
  _unused: null,
  message: OmitPartialGroupDMChannel<Message<boolean>>
) {
  if (message.author.bot) return;

  await message.channel.sendTyping();

  try {
    const result = await generateResponse(
      process.env.DEEPSEEK_MODEL || '',
      message.content
    );
    if (!result) return;

    const fullResponse = result.response || '';
    // Split into chunks
    for (let i = 0; i < fullResponse.length; i += 2000) {
      const chunk = fullResponse.slice(i, i + 2000);
      const sentMessage = await message.reply(cleanAIResponse(chunk));
    }
  } catch (err: any) {
    console.error(`Error in localFetch: ${err.message}`);
    await message.reply(
      `An error occurred while processing your request. Error: ${err.message}`
    );
  }
}


body: JSON.stringify({
  model: process.env.DEEPSEEK_MODEL,
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user",   content: prompt }
  ]
})

client.login(process.env.DISCORD_TOKEN);

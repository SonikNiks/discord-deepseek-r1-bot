import dotenv from "dotenv";
dotenv.config();
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  OmitPartialGroupDMChannel,
} from "discord.js";

import generateResponse from "./lib/fetch/internal";
import cleanAIResponse from "./lib/utils/cleanResponse";
import generateAPIResponse from "./lib/fetch/external";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.MessageContent,
  ],
});

client.on(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
});

async function localFetch(
  thinkingMessage: Message<boolean>,
  message: OmitPartialGroupDMChannel<Message<boolean>>
) {
  if (message.author.bot) return;

  try {
    const result = await generateResponse(
      process.env.DEEPSEEK_MODEL,
      message.content
    );

    if (result) {
      thinkingMessage.delete();
      await message.reply(cleanAIResponse(result?.response));
    }
  } catch (err) {
    thinkingMessage.delete();
    await message.reply(
      `An error occurred while processing your request. Error: ${err.message}`
    );
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const thinkingMessage = await message.reply({
    content: "Let me thinking...",
    options: {
      ephemeral: true,
    },
  });

  try {
    const result = await generateAPIResponse("deepseek-chat", message.content);

    if (result) {
      // @ts-expect-error - `result` is a string
      await message.reply(cleanAIResponse(result?.response));
    }
  } catch (err) {
    await localFetch(thinkingMessage, message);
  }
});

client.login(process.env.DISCORD_TOKEN);

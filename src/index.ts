import dotenv from "dotenv";
dotenv.config();
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  OmitPartialGroupDMChannel,
  Partials,
  AttachmentBuilder,
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

client.on('messageCreate', message => {
  // Игнорируем собственные сообщения
  if (message.author.bot) return;
  
  // Любой DM или упоминание в гильдии
  if (message.channel.type === 'DM') {
    message.channel.send('Привет! Я получил твоё личное сообщение 😊');
  }
  // … ваш остальной код
});

async function localFetch(
  thinkingMessage: Message<boolean>,
  message: OmitPartialGroupDMChannel<Message<boolean>>
) {
  if (message.author.bot) return;

  await message.channel.sendTyping();

  try {
    const result = await generateResponse(
      process.env.DEEPSEEK_MODEL || "",
      message.content
    );

    if (result) {
      thinkingMessage.delete();
      const sentMessage = await message.reply(
        cleanAIResponse((result?.response || "").slice(0, 2000))
      );
      await sentMessage.react("👍🏻");
      await sentMessage.react("👎🏻");
      if ((result?.response || "").length > 2000) {
        const buffer = Buffer.from(result?.response, "utf-8");
        const attachment = new AttachmentBuilder(buffer, {
          name: "response.txt",
        });
        await message.reply(
          "Sorry, I can't send more than 2000 length message :(, but here is the response in a file!"
        );
        await message.reply({ files: [attachment] });
      }
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
    content: "Let me thinking and write the answers for you...",
    options: {
      ephemeral: true,
    },
  });

  await message.channel.sendTyping();

  try {
    if (process.env.ONLY_LOCAL === "true") {
      return await localFetch(thinkingMessage, message);
    } else {
      console.log("Skipping only local...");
    }

    const result = await generateAPIResponse("deepseek-chat", message.content);

    if (result) {
      if (Array.isArray(result)) {
        await sendPaginatedReply(message, result);
      } else {
        const sentMessage = await message.reply(
          cleanAIResponse((result || "").slice(0, 2000))
        );
        await sentMessage.react("👍🏻");
        await sentMessage.react("👎🏻");
        if (result.length > 2000) {
          const buffer = Buffer.from(result, "utf-8");
          const attachment = new AttachmentBuilder(buffer, {
            name: "response.txt",
          });
          await message.reply(
            "Sorry, I can't send more than 2000 length message :(, but here is the response in a file!"
          );
          await message.reply({ files: [attachment] });
        }
      }
    }
  } catch (err) {
    console.log(`Error using API: ${err.message}`);
    await localFetch(thinkingMessage, message);
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Failed to fetch the reaction:", error);
        return;
      }
    }

    if (user.bot) return;

    if (reaction.emoji.name === "👍🏻") {
      await reaction.message.reply(`Glad you liked my answer!`);
    } else if (reaction.emoji.name === "👎🏻") {
      await reaction.message.reply(`Oh no! you disliked my answer!`);
    }
  } catch (err) {
    console.error(err);
  }
});


body: JSON.stringify({
  model: process.env.DEEPSEEK_MODEL,
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user",   content: prompt }
  ]
})

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;

  // Показываем «бот печатает…», без лишнего текста
  await message.channel.sendTyping();

  // Готовим prompt и messagesArray, как раньше
  const prompt = message.content;
  const messagesArray = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user',   content: prompt }
  ];

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', { /* … */ });
    console.log('> Deepseek status:', res.status);
    const raw = await res.text();
    console.log('> Deepseek raw response:', raw);
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
      throw new Error(`Bad response: ${res.status}`);
    }
    const data = JSON.parse(raw);
    const reply = data.choices?.[0]?.message?.content;
    if (reply) {
      await message.channel.send(reply);
    } else {
      console.warn('No reply in Deepseek response', data);
      // можно либо молча ничего не шлём, либо отправить очень короткое:
      await message.channel.send('Прости, не нашёл ответа.');
    }
  } catch (err) {
    console.error('Deepseek request failed:', err);
    // не отправляем err в чат, просто выходим или шлём минимальное уведомление
    // await message.channel.send('Упс, что-то пошло не так, попробуй позже.');
  }
});

client.login(process.env.DISCORD_TOKEN);

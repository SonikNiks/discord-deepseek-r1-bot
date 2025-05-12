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

  // 1. Собираем prompt из сообщения пользователя
  const prompt = message.content;

  // 2. Формируем массив сообщений для Deepseek
  const messagesArray = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user',   content: prompt }
  ];

  // 3. Логируем запрос для диагностики
  console.log('> Deepseek prompt:', prompt);
  console.log('> Deepseek request body:', JSON.stringify({
    model: process.env.DEEPSEEK_MODEL,
    messages: messagesArray
  }));

  try {
    // 4. Делаем POST-запрос к Deepseek
    const res = await fetch('https://api.deepseek.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL,
        messages: messagesArray
      })
    });

    // 5. Логируем статус и тело ответа
    console.log('> Deepseek status:', res.status);
    const data = await res.json();
    console.log('> Deepseek response body:', data);

    // 6. Извлекаем ответ и отправляем в канал
    const reply = data.choices?.[0]?.message?.content;
    if (reply) {
      await message.channel.send(reply);
    } else {
      await message.channel.send("Sorry, I couldn't find any response for you.");
    }

  } catch (err) {
    console.error('> Deepseek request error:', err);
    await message.channel.send("Внутренняя ошибка при обращении к Deepseek.");
  }
});

// И не забудьте в самом конце:
client.login(process.env.DISCORD_TOKEN);

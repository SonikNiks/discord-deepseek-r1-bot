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
    message.channel.send('Привет! Я тут');
  }
  // … ваш остальной код
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;

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
      await sentMessage.react('👍🏻');
      await sentMessage.react('👎🏻');
    }
  } catch (err: any) {
    console.error(`Error in localFetch: ${err.message}`);
    await message.reply(
      `An error occurred while processing your request. Error: ${err.message}`
    );
  }
}


client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;

    // Показываем индикатор "печати"
    await message.channel.sendTyping();

    // Только локальный режим
    if (process.env.ONLY_LOCAL === "true") {
      return await localFetch(null, message);
    } else {
      console.log("Skipping only local...");
    }

    // Получаем ответ от API
    const result = await generateAPIResponse("deepseek-chat", message.content);
    if (!result) return;

    // Обрабатываем результат: либо массив строк, либо одна строка
    const fullReply = Array.isArray(result) ? result.join("\n") : result;

    // Разбиваем на куски по 2000 символов
    const chunks: string[] = [];
    for (let i = 0; i < fullReply.length; i += 2000) {
      chunks.push(fullReply.slice(i, i + 2000));
    }

    // Отправляем каждый кусок как отдельное сообщение
    for (const chunk of chunks) {
      const sent = await message.reply(cleanAIResponse(chunk));
      await sent.react("👍🏻");
      await sent.react("👎🏻");
    }

  } catch (err: any) {
    console.error(`Error using API: ${err.message}`);
    await localFetch(null, message);
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

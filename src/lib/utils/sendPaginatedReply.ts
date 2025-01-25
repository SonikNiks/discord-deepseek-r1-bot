import { Message } from "discord.js";
import cleanAIResponse from "./cleanResponse";

async function sendPaginatedReply(message: Message, choices: string[]) {
  const itemsPerPage = 1;
  let currentPage = 0;

  const generatePage = (page: number) => {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageChoices = choices.slice(start, end);

    return pageChoices
      .map(
        (choice, index) =>
          `**${start + index + 1}.** ${cleanAIResponse(choice)}`
      )
      .join("\n");
  };

  const sentMessage = await message.reply({
    content: `**Page ${currentPage + 1}**\n${generatePage(currentPage)}`,
    options: {
      fetchReply: true,
    },
  });

  await sentMessage.react("⬅️");
  await sentMessage.react("➡️");

  const filter = (reaction: any, user: any) => {
    return (
      ["⬅️", "➡️"].includes(reaction.emoji.name) &&
      user.id === message.author.id
    );
  };

  const collector = sentMessage.createReactionCollector({
    filter,
    time: 60000,
  });

  collector.on("collect", async (reaction) => {
    await reaction.users.remove(message.author);

    if (reaction.emoji.name === "⬅️" && currentPage > 0) {
      currentPage--;
    } else if (
      reaction.emoji.name === "➡️" &&
      (currentPage + 1) * itemsPerPage < choices.length
    ) {
      currentPage++;
    }

    await sentMessage.edit({
      content: `**Page ${currentPage + 1}**\n${generatePage(currentPage)}`,
    });
  });

  collector.on("end", () => {
    sentMessage.reactions.removeAll().catch(console.error);
  });
}

export default sendPaginatedReply;

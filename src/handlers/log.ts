import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.command("log", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    await ctx.reply("This command works in groups only.");
    return;
  }

  const senderId = ctx.from?.id;
  if (!senderId) return;
  try {
    const member = await ctx.api.getChatMember(chatId, senderId);
    if (!["administrator", "creator"].includes(member.status)) {
      await ctx.reply("Only admins can view the action log.");
      return;
    }
  } catch {
    await ctx.reply("Couldn't verify your permissions. Try again.");
    return;
  }

  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
  let count = 10;

  if (args.length > 0) {
    const parsed = parseInt(args[0]);
    if (isNaN(parsed) || parsed < 0) {
      await ctx.reply("Please provide a valid number. Example: /log 20", {
        reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
      });
      return;
    }
    count = Math.min(parsed, 1000);
  }

  const logs = ctx.session.commandLogs.slice(-count).reverse();

  if (logs.length === 0) {
    await ctx.reply("No moderation actions recorded yet.", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = logs.map((entry, i) => {
    const time = new Date(entry.timestamp).toLocaleString();
    return `${i + 1}. ${entry.action.toUpperCase()} — target: ${entry.target} — by: ${entry.moderator} — ${time}`;
  });

  const text = `📋 Last ${logs.length} moderation actions:\n\n${lines.join("\n")}`;

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

export default composer;

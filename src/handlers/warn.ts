import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.command("warn", async (ctx) => {
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
      await ctx.reply("Only admins can use this command.");
      return;
    }
  } catch {
    await ctx.reply("Couldn't verify your permissions. Try again.");
    return;
  }

  const replyTo = ctx.message?.reply_to_message;
  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];

  let targetId: number | undefined;
  let targetName: string | undefined;

  if (replyTo?.from && !replyTo.from.is_bot) {
    targetId = replyTo.from.id;
    targetName = replyTo.from.first_name;
  } else if (args.length > 0 && args[0].startsWith("@")) {
    await ctx.reply("Please reply to a user's message to warn them.");
    return;
  } else if (args.length > 0) {
    await ctx.reply("Please reply to a user's message to warn them.");
    return;
  } else {
    await ctx.reply("Usage: reply to a user's message and type /warn [reason]", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  if (!targetId || !targetName) {
    await ctx.reply("Couldn't identify the target user.");
    return;
  }

  const reason = args.join(" ").trim() || "No reason specified";
  const member = ctx.session.members.get(targetId);
  const previousWarns = ctx.session.infractions.filter(
    (i) => i.memberId === targetId && i.type === "warn",
  ).length;

  ctx.session.infractions.push({
    memberId: targetId,
    type: "warn",
    timestamp: Date.now(),
    reason,
    moderator: senderId,
  });

  ctx.session.commandLogs.push({
    action: "warn",
    target: targetId,
    moderator: senderId,
    timestamp: Date.now(),
  });

  const thresholds = ctx.session.settings.autoActionThresholds;
  const totalWarns = previousWarns + 1;

  if (totalWarns >= thresholds.maxInfractionsBeforeRemove) {
    await ctx.reply(`⚠️ ${targetName} has been warned (${totalWarns} warnings). Next step: removal from the group.`, {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
  } else if (totalWarns >= thresholds.maxInfractionsBeforeMute) {
    await ctx.reply(`⚠️ ${targetName} has been warned (${totalWarns} warnings). Next step: mute.`, {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
  } else {
    await ctx.reply(`⚠️ ${targetName} has been warned. Reason: ${reason} (${totalWarns}/${thresholds.maxInfractionsBeforeMute} warnings before mute)`, {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
  }
});

export default composer;

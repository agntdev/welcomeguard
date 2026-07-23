import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.command("mute", async (ctx) => {
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
  } else {
    await ctx.reply("Usage: reply to a user's message and type /mute <duration> [reason]\n\nDuration examples: 10m, 1h, 1d", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  if (!targetId || !targetName) {
    await ctx.reply("Couldn't identify the target user.");
    return;
  }

  const durationStr = args[0];
  if (!durationStr) {
    await ctx.reply("Please specify a duration. Examples: /mute 10m, /mute 1h, /mute 1d", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  const durationMatch = /^(\d+)(m|h|d)$/.exec(durationStr);
  if (!durationMatch) {
    await ctx.reply("Invalid duration format. Use: 10m (minutes), 1h (hours), or 1d (days).", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  const amount = parseInt(durationMatch[1]);
  const unit = durationMatch[2];
  const multipliers: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  const durationMs = amount * multipliers[unit];
  const until = Math.floor((Date.now() + durationMs) / 1000);

  try {
    await ctx.restrictChatMember(targetId, { can_send_messages: false }, { until_date: until });
  } catch {
    await ctx.reply("Couldn't mute that user. Check that I have permission to restrict members.");
    return;
  }

  const reason = args.slice(1).join(" ").trim() || "No reason specified";

  ctx.session.infractions.push({
    memberId: targetId,
    type: "mute",
    timestamp: Date.now(),
    reason,
    moderator: senderId,
  });

  ctx.session.commandLogs.push({
    action: "mute",
    target: targetId,
    moderator: senderId,
    timestamp: Date.now(),
  });

  await ctx.reply(`🔇 ${targetName} has been muted for ${durationStr}. Reason: ${reason}`, {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

export default composer;

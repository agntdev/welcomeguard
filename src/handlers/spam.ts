import { Composer } from "grammy";
import type { Ctx } from "../bot.js";

const composer = new Composer<Ctx>();

const messageTimestamps = new Map<number, number[]>();
const messageContents = new Map<number, string[]>();

function isSpam(
  userId: number,
  text: string,
  session: Ctx["session"],
): { spam: boolean; reason: string } {
  const now = Date.now();
  const timestamps = messageTimestamps.get(userId) || [];
  const contents = messageContents.get(userId) || [];

  const recentTimestamps = timestamps.filter((t) => now - t < 10_000);
  messageTimestamps.set(userId, [...recentTimestamps, now]);

  const recentContents = [...contents, text].slice(-20);
  messageContents.set(userId, recentContents);

  if (recentTimestamps.length >= 5) {
    return { spam: true, reason: "flooding (5+ messages in 10 seconds)" };
  }

  const duplicateCount = recentContents.filter((c) => c === text).length;
  if (duplicateCount >= 3) {
    return { spam: true, reason: "repetitive messages (3+ identical)" };
  }

  const member = session.members.get(userId);
  if (member) {
    const accountAge = now - member.joinTime;
    if (accountAge < 60_000 && recentTimestamps.length >= 2) {
      return { spam: true, reason: "new account flooding" };
    }
  }

  return { spam: false, reason: "" };
}

async function applySpamAction(ctx: Ctx, userId: number, reason: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const thresholds = ctx.session.settings.autoActionThresholds;
  const recentInfractions = ctx.session.infractions.filter(
    (i) => i.memberId === userId && i.type === "warn",
  ).length;

  const displayName = ctx.from?.first_name || "User";

  ctx.session.infractions.push({
    memberId: userId,
    type: "warn",
    timestamp: Date.now(),
    reason,
    moderator: 0,
  });

  ctx.session.commandLogs.push({
    action: "spam_warn",
    target: userId,
    moderator: 0,
    timestamp: Date.now(),
  });

  const totalWarns = recentInfractions + 1;

  if (totalWarns >= thresholds.maxInfractionsBeforeRemove) {
    try {
      await ctx.api.banChatMember(chatId, userId);
      ctx.session.infractions.push({
        memberId: userId,
        type: "remove",
        timestamp: Date.now(),
        reason: "spam (auto-removal after threshold)",
        moderator: 0,
      });
      ctx.session.commandLogs.push({
        action: "spam_remove",
        target: userId,
        moderator: 0,
        timestamp: Date.now(),
      });
      await ctx.reply(`🚫 ${displayName} has been removed for repeated spam.`);
    } catch {
      await ctx.reply(`⚠️ ${displayName} exceeded spam thresholds but couldn't be removed.`);
    }
  } else if (totalWarns >= thresholds.maxInfractionsBeforeMute) {
    try {
      await ctx.restrictChatMember(userId, { can_send_messages: false }, { until_date: Math.floor((Date.now() + 10 * 60_000) / 1000) });
      ctx.session.infractions.push({
        memberId: userId,
        type: "mute",
        timestamp: Date.now(),
        reason: "spam (auto-mute after threshold)",
        moderator: 0,
      });
      ctx.session.commandLogs.push({
        action: "spam_mute",
        target: userId,
        moderator: 0,
        timestamp: Date.now(),
      });
      await ctx.reply(`🔇 ${displayName} has been muted for 10 minutes due to spam.`);
    } catch {
      await ctx.reply(`⚠️ ${displayName} exceeded spam thresholds but couldn't be muted.`);
    }
  } else {
    await ctx.reply(`⚠️ ${displayName}, please stop spamming. Further violations will result in muting or removal.`);
  }
}

composer.on("message:text", async (ctx, next) => {
  const chatId = ctx.chat?.id;
  if (!chatId) { await next(); return; }
  if (ctx.chat.type === "private") { await next(); return; }

  const userId = ctx.from?.id;
  if (!userId) { await next(); return; }
  const text = ctx.message.text;

  if (ctx.session.settings.trustedUserIds.includes(userId)) { await next(); return; }

  const { spam, reason } = isSpam(userId, text, ctx.session);
  if (spam) {
    await applySpamAction(ctx, userId, reason);
  }
  await next();
});

export default composer;

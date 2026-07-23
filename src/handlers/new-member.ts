import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.on("chat_member", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const newMember = ctx.chatMember.new_chat_member;
  const oldMember = ctx.chatMember.old_chat_member;

  if (newMember.status !== "member" || oldMember.status === "member") return;
  if (newMember.user.is_bot) return;

  const userId = newMember.user.id;
  const displayName = newMember.user.first_name + (newMember.user.last_name ? ` ${newMember.user.last_name}` : "");

  if (ctx.session.settings.trustedUserIds.includes(userId)) {
    ctx.session.members.set(userId, {
      id: userId,
      displayName,
      joinTime: Date.now(),
      trusted: true,
      verificationStatus: "verified",
    });
    return;
  }

  const pendingExpiry = Date.now() + ctx.session.settings.autoActionThresholds.verificationTimeoutMinutes * 60 * 1000;

  ctx.session.pendingVerifications.set(userId, {
    memberId: userId,
    challengeMessageId: 0,
    expiresAt: pendingExpiry,
  });

  ctx.session.members.set(userId, {
    id: userId,
    displayName,
    joinTime: Date.now(),
    trusted: false,
    verificationStatus: "pending",
  });

  const welcomeText = ctx.session.settings.welcomeText || "Welcome to the group! Tap the button below to verify you're human.";

  await ctx.reply(welcomeText, {
    reply_markup: inlineKeyboard([[inlineButton("I'm human", "verify:member")]]),
  });
});

export default composer;

import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("verify:member", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const pending = ctx.session.pendingVerifications.get(userId);

  if (!pending) {
    await ctx.reply("You're already verified or not pending verification.", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.pendingVerifications.delete(userId);
  const member = ctx.session.members.get(userId);
  if (member) {
    member.verificationStatus = "verified";
  }

  await ctx.reply("✅ You've been verified! You can now participate in the group.", {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

export default composer;

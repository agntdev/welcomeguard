import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function countActionsInPeriod(logs: Ctx["session"]["commandLogs"], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return logs.filter((l) => l.timestamp >= cutoff).length;
}

composer.command("overview", async (ctx) => {
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
      await ctx.reply("Only admins can view the overview.");
      return;
    }
  } catch {
    await ctx.reply("Couldn't verify your permissions. Try again.");
    return;
  }

  const members = ctx.session.members;
  const infractions = ctx.session.infractions;
  const logs = ctx.session.commandLogs;

  const totalMembers = members.size;
  const verifiedMembers = [...members.values()].filter((m) => m.verificationStatus === "verified").length;
  const pendingMembers = [...members.values()].filter((m) => m.verificationStatus === "pending").length;
  const trustedMembers = [...members.values()].filter((m) => m.trusted).length;

  const totalInfractions = infractions.length;
  const warns = infractions.filter((i) => i.type === "warn").length;
  const mutes = infractions.filter((i) => i.type === "mute").length;
  const removals = infractions.filter((i) => i.type === "remove").length;

  const actions7d = countActionsInPeriod(logs, 7);
  const actions30d = countActionsInPeriod(logs, 30);

  const text =
    `📊 Group Overview\n\n` +
    `👥 Members: ${totalMembers} total, ${verifiedMembers} verified, ${pendingMembers} pending, ${trustedMembers} trusted\n\n` +
    `⚠️ Infractions: ${totalInfractions} total (${warns} warns, ${mutes} mutes, ${removals} removals)\n\n` +
    `📈 Activity: ${actions7d} actions (7d), ${actions30d} actions (30d)`;

  await ctx.reply(text, {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

export default composer;

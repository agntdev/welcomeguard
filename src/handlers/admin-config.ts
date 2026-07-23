import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";

registerMainMenuItem({ label: "⚙️ Settings", data: "admin:config", order: 50 });

const composer = new Composer<Ctx>();

composer.callbackQuery("admin:config", async (ctx) => {
  await ctx.answerCallbackQuery();
  const text =
    "⚙️ Admin Settings\n\n" +
    "Customize how GroupGuardian works for your group.";

  await ctx.editMessageText(text, {
    reply_markup: inlineKeyboard([
      [inlineButton("Change welcome text", "config:setwelcome"), inlineButton("Change rules", "config:setrules")],
      [inlineButton("Adjust thresholds", "config:thresholds")],
      [inlineButton("Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("config:setwelcome", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_welcome_text";
  await ctx.editMessageText(
    "Send me the new welcome text for new members. You can use it to explain group rules or set expectations.",
  );
});

composer.callbackQuery("config:setrules", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_rules_text";
  await ctx.editMessageText("Send me the group rules. These will be shown when requested.");
});

composer.callbackQuery("config:thresholds", async (ctx) => {
  await ctx.answerCallbackQuery();
  const t = ctx.session.settings.autoActionThresholds;
  const text =
    `Current thresholds:\n\n` +
    `• Warns before mute: ${t.maxInfractionsBeforeMute}\n` +
    `• Warns before removal: ${t.maxInfractionsBeforeRemove}\n` +
    `• Verification timeout: ${t.verificationTimeoutMinutes} minutes\n\n` +
    `To change, type: /setthresholds <mute> <remove> <timeout_minutes>\n` +
    `Example: /setthresholds 2 4 5`;

  await ctx.editMessageText(text, {
    reply_markup: inlineKeyboard([[inlineButton("Back to settings", "admin:config")]]),
  });
});

composer.command("setwelcome", async (ctx) => {
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
      await ctx.reply("Only admins can change settings.");
      return;
    }
  } catch {
    await ctx.reply("Couldn't verify your permissions. Try again.");
    return;
  }

  const text = ctx.message?.text?.replace(/^\/setwelcome\s*/, "").trim();
  if (!text) {
    await ctx.reply("Please provide the welcome text after the command.\nExample: /setwelcome Welcome to our group! Please verify you're human.", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.settings.welcomeText = text;
  ctx.session.commandLogs.push({
    action: "setwelcome",
    target: 0,
    moderator: senderId,
    timestamp: Date.now(),
  });

  await ctx.reply("✅ Welcome text updated!", {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

composer.command("setrules", async (ctx) => {
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
      await ctx.reply("Only admins can change settings.");
      return;
    }
  } catch {
    await ctx.reply("Couldn't verify your permissions. Try again.");
    return;
  }

  const text = ctx.message?.text?.replace(/^\/setrules\s*/, "").trim();
  if (!text) {
    await ctx.reply("Please provide the rules after the command.\nExample: /setrules Be respectful. No spam. No NSFW content.", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.settings.rules = text;
  ctx.session.commandLogs.push({
    action: "setrules",
    target: 0,
    moderator: senderId,
    timestamp: Date.now(),
  });

  await ctx.reply("✅ Rules updated!", {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

composer.command("setthresholds", async (ctx) => {
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
      await ctx.reply("Only admins can change settings.");
      return;
    }
  } catch {
    await ctx.reply("Couldn't verify your permissions. Try again.");
    return;
  }

  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
  if (args.length < 3) {
    await ctx.reply("Usage: /setthresholds <mute_at> <remove_at> <timeout_minutes>\n\nExample: /setthresholds 2 4 5", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  const muteAt = parseInt(args[0]);
  const removeAt = parseInt(args[1]);
  const timeout = parseInt(args[2]);

  if (isNaN(muteAt) || isNaN(removeAt) || isNaN(timeout) || muteAt < 1 || removeAt < muteAt || timeout < 1) {
    await ctx.reply("Invalid values. Mute threshold must be ≥ 1, remove must be ≥ mute, timeout must be ≥ 1 minute.", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.settings.autoActionThresholds.maxInfractionsBeforeMute = muteAt;
  ctx.session.settings.autoActionThresholds.maxInfractionsBeforeRemove = removeAt;
  ctx.session.settings.autoActionThresholds.verificationTimeoutMinutes = timeout;

  ctx.session.commandLogs.push({
    action: "setthresholds",
    target: 0,
    moderator: senderId,
    timestamp: Date.now(),
  });

  await ctx.reply(`✅ Thresholds updated!\n\n• Warns before mute: ${muteAt}\n• Warns before removal: ${removeAt}\n• Verification timeout: ${timeout} minutes`, {
    reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
  });
});

export default composer;

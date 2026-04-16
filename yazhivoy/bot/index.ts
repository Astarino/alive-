import { bot, db } from "./shared"
import { authCodes, users } from "../src/lib/db/schema"
import { eq, and, isNull, sql } from "drizzle-orm"
import { computeStatus, msUntilDeadline } from "../src/lib/status"
import "./cron"

const siteUrl = process.env.SITE_URL ?? ""

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "время вышло"
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h >= 48) return `${Math.floor(h / 24)} дн`
  if (h > 0) return `${h} ч ${m} мин`
  return `${m} мин`
}

// Регистрируем команды — появятся в меню Telegram
bot.api.setMyCommands([
  { command: "start",   description: "Начало работы" },
  { command: "status",  description: "Мой статус и таймер" },
  { command: "checkin", description: "Отметиться без сайта" },
  { command: "stats",   description: "Сколько живых прямо сейчас" },
  { command: "help",    description: "Справка" },
]).catch(console.error)

// /start — вход или приветствие
bot.command("start", async (ctx) => {
  const param = ctx.match?.trim() ?? ""

  if (param.startsWith("auth_")) {
    const sessionToken = param.slice(5)
    const telegramId = ctx.from!.id

    // Атомарный UPDATE: обновляем только если telegramId ещё не задан
    // Исключает дубли при двух одновременных обработчиках
    const updated = await db
      .update(authCodes)
      .set({ telegramId })
      .where(and(eq(authCodes.sessionToken, sessionToken), isNull(authCodes.telegramId)))
      .returning({ id: authCodes.id })

    if (updated.length === 0) {
      await ctx.reply("Ссылка устарела или уже использована.\nОткрой сайт и попробуй снова.")
      return
    }

    await ctx.reply("✅ Готово! Возвращайся на сайт — вход выполнен автоматически.")
    return
  }

  const showButton = siteUrl.startsWith("https://")
  await ctx.reply(
    "Привет! Я бот сервиса <b>яживой</b> 👋\n\n" +
    "Отмечайся раз в несколько часов — и друзья знают, что всё ок.\n" +
    "Если пропустишь дедлайн — они получат уведомление.\n\n" +
    "/status — твой таймер\n" +
    "/checkin — отметиться здесь\n" +
    "/help — как это работает",
    {
      parse_mode: "HTML",
      ...(showButton && {
        reply_markup: {
          inline_keyboard: [[{ text: "Открыть сайт", url: siteUrl }]],
        },
      }),
    }
  )
})

// /status — показать текущий статус и таймер
bot.command("status", async (ctx) => {
  const telegramId = ctx.from?.id
  if (!telegramId) return

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1)

  if (!user?.onboardingDone) {
    await ctx.reply(
      "Ты ещё не зарегистрирован." +
      (siteUrl ? `\n\nЗайди на сайт: ${siteUrl}` : "")
    )
    return
  }

  const status = computeStatus(user.lastCheckinAt, user.checkIntervalHours)
  const ms = msUntilDeadline(user.lastCheckinAt, user.checkIntervalHours)

  const icon = status === "alive" ? "🟢" : status === "overdue" ? "🔴" : "⚪"
  const statusLabel = status === "alive" ? "живой" : status === "overdue" ? "просрочено" : "не начал"

  let text = `${icon} <b>${user.displayName}</b> — ${statusLabel}\n\n`

  if (user.lastCheckinAt) {
    const hoursAgo = Math.floor((Date.now() - user.lastCheckinAt.getTime()) / 3_600_000)
    text += `Последняя отметка: ${hoursAgo < 1 ? "только что" : `${hoursAgo} ч назад`}\n`
  } else {
    text += `Ещё ни разу не отмечался\n`
  }

  if (ms != null && ms > 0) {
    text += `До дедлайна: ${formatTimeLeft(ms)}\n`
  } else if (status === "overdue") {
    text += `Дедлайн: просрочен ⚠️\n`
  }

  text += `\nИнтервал: каждые ${user.checkIntervalHours} ч`

  if (status !== "overdue") {
    text += `\n\nОтметиться: /checkin`
  }

  await ctx.reply(text, { parse_mode: "HTML" })
})

// /checkin — отметиться прямо из Telegram
bot.command("checkin", async (ctx) => {
  const telegramId = ctx.from?.id
  if (!telegramId) return

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1)

  if (!user?.onboardingDone) {
    await ctx.reply(
      "Сначала нужно зарегистрироваться на сайте." +
      (siteUrl ? `\n${siteUrl}` : "")
    )
    return
  }

  const COOLDOWN = 60 * 60 * 1000
  if (user.lastCheckinAt && Date.now() - user.lastCheckinAt.getTime() < COOLDOWN) {
    const minLeft = Math.ceil((COOLDOWN - (Date.now() - user.lastCheckinAt.getTime())) / 60_000)
    await ctx.reply(`Ты уже отмечался недавно. Подожди ещё ${minLeft} мин.`)
    return
  }

  const now = new Date()
  await db
    .update(users)
    .set({ lastCheckinAt: now, lastCheckinMsg: null })
    .where(eq(users.id, user.id))

  const ms = msUntilDeadline(now, user.checkIntervalHours)
  await ctx.reply(
    `✅ Отмечено!\n\nСледующий дедлайн через ${formatTimeLeft(ms ?? 0)}.`
  )
})

// /stats — глобальная статистика
bot.command("stats", async (ctx) => {
  const [alive] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`
      onboarding_done = true
      AND last_checkin_at IS NOT NULL
      AND last_checkin_at + (check_interval_hours || ' hours')::interval > now()
    `)

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(sql`onboarding_done = true`)

  const aliveCount = alive?.count ?? 0
  const totalCount = total?.count ?? 0
  const pct = totalCount > 0 ? Math.round((aliveCount / totalCount) * 100) : 0

  await ctx.reply(
    `🟢 <b>Живых прямо сейчас: ${aliveCount}</b> из ${totalCount}\n` +
    `${pct}% пользователей в норме`,
    { parse_mode: "HTML" }
  )
})

// /help
bot.command("help", async (ctx) => {
  await ctx.reply(
    "<b>Как работает яживой:</b>\n\n" +
    "1. Ты выбираешь интервал (12 / 24 / 48 / 72 ч)\n" +
    "2. Раз в этот период нужно нажать кнопку «я жив»\n" +
    "3. За 6 часов до дедлайна придёт напоминание\n" +
    "4. Если пропустишь — твои друзья получат уведомление\n\n" +
    "<b>Команды:</b>\n" +
    "/status — твой статус и таймер\n" +
    "/checkin — отметиться здесь без открытия сайта\n" +
    "/stats — сколько живых прямо сейчас\n" +
    (siteUrl ? `\n<b>Сайт:</b> ${siteUrl}` : ""),
    { parse_mode: "HTML" }
  )
})

bot.catch((err) => {
  console.error(`[bot] ошибка обновления ${err.ctx?.update.update_id}:`, err.message)
})

bot.start()
console.log("Bot started")

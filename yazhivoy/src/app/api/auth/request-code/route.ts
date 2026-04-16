import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { authCodes } from "@/lib/db/schema"
import { eq, and, gt, count } from "drizzle-orm"
import { getBot } from "@/lib/bot"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const telegramId = Number(body?.telegram_id)

  if (!telegramId || telegramId <= 0 || !Number.isInteger(telegramId)) {
    return NextResponse.json({ error: "Некорректный Telegram ID" }, { status: 400 })
  }

  const now = new Date()

  // Rate limit: 1 запрос в минуту
  const oneMinuteAgo = new Date(now.getTime() - 60_000)
  const [recentMinute] = await db
    .select({ cnt: count() })
    .from(authCodes)
    .where(
      and(
        eq(authCodes.telegramId, telegramId),
        gt(authCodes.createdAt, oneMinuteAgo)
      )
    )

  if ((recentMinute?.cnt ?? 0) >= 1) {
    return NextResponse.json(
      { error: "Подождите немного перед повторным запросом" },
      { status: 429 }
    )
  }

  // Rate limit: 5 запросов в час
  const oneHourAgo = new Date(now.getTime() - 3_600_000)
  const [recentHour] = await db
    .select({ cnt: count() })
    .from(authCodes)
    .where(
      and(
        eq(authCodes.telegramId, telegramId),
        gt(authCodes.createdAt, oneHourAgo)
      )
    )

  if ((recentHour?.cnt ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через час" },
      { status: 429 }
    )
  }

  // Генерируем 6-значный код
  const code = String(Math.floor(100_000 + Math.random() * 900_000))
  const expiresAt = new Date(now.getTime() + 5 * 60_000) // 5 минут

  await db.insert(authCodes).values({ telegramId, code, expiresAt })

  // Отправляем через бота
  const bot = getBot()
  try {
    await bot.api.sendMessage(
      telegramId,
      `Ваш код входа: <b>${code}</b>\n\nДействует 5 минут. Никому не сообщайте.`,
      { parse_mode: "HTML" }
    )
  } catch {
    return NextResponse.json(
      { error: "Не удалось отправить код. Убедитесь, что вы запустили бота: /start" },
      { status: 422 }
    )
  }

  return NextResponse.json({
    ok: true,
    bot_username: process.env.BOT_USERNAME,
  })
}

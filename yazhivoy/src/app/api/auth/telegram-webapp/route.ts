import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createSession } from "@/lib/auth"

function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return false

  params.delete("hash")

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n")

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest()
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  return hash === expectedHash
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const initData: string = body?.init_data ?? ""

  if (!initData) {
    return NextResponse.json({ error: "init_data отсутствует" }, { status: 400 })
  }

  const botToken = process.env.BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({ error: "Сервер не настроен" }, { status: 500 })
  }

  if (!validateInitData(initData, botToken)) {
    return NextResponse.json({ error: "Подпись не прошла проверку" }, { status: 401 })
  }

  const params = new URLSearchParams(initData)
  const userJson = params.get("user")
  if (!userJson) {
    return NextResponse.json({ error: "Нет данных пользователя" }, { status: 400 })
  }

  const tgUser = JSON.parse(userJson) as {
    id: number
    first_name: string
    last_name?: string
    username?: string
  }

  let user = (
    await db.select().from(users).where(eq(users.telegramId, tgUser.id)).limit(1)
  )[0]

  if (!user) {
    const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ")
    ;[user] = await db
      .insert(users)
      .values({ telegramId: tgUser.id, displayName })
      .returning()
  }

  await createSession(user.id)

  return NextResponse.json({ onboarding_done: user.onboardingDone })
}

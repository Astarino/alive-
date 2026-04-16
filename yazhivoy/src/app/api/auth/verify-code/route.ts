import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { authCodes, users } from "@/lib/db/schema"
import { eq, and, gt, isNotNull } from "drizzle-orm"
import { createSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const code = String(body?.code ?? "").trim()
  const sessionToken = String(body?.session_token ?? "").trim()

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Код должен быть 6 цифр" }, { status: 400 })
  }

  if (!sessionToken) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 400 })
  }

  const now = new Date()

  const [authCode] = await db
    .select()
    .from(authCodes)
    .where(
      and(
        eq(authCodes.sessionToken, sessionToken),
        eq(authCodes.code, code),
        eq(authCodes.used, false),
        isNotNull(authCodes.telegramId),
        gt(authCodes.expiresAt, now)
      )
    )
    .limit(1)

  if (!authCode) {
    return NextResponse.json(
      { error: "Код неверный или истёк. Попробуйте войти снова" },
      { status: 401 }
    )
  }

  await db.update(authCodes).set({ used: true }).where(eq(authCodes.id, authCode.id))

  let user = (
    await db
      .select()
      .from(users)
      .where(eq(users.telegramId, authCode.telegramId!))
      .limit(1)
  )[0]

  if (!user) {
    ;[user] = await db
      .insert(users)
      .values({
        telegramId: authCode.telegramId!,
        displayName: `User${authCode.telegramId}`,
      })
      .returning()
  }

  await createSession(user.id)

  return NextResponse.json({ onboarding_done: user.onboardingDone })
}

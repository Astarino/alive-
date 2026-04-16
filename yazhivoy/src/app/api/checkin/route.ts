import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAuthAndOnboarding } from "@/lib/auth"
import { computeStatus, msUntilDeadline } from "@/lib/status"

export async function POST(req: NextRequest) {
  const session = await requireAuthAndOnboarding()
  const body = await req.json().catch(() => ({}))

  const { lastCheckinAt, checkIntervalHours } = session

  // Защита от случайных двойных нажатий — не сбрасываем таймер в течение 1 часа
  if (lastCheckinAt && Date.now() - lastCheckinAt.getTime() < 3_600_000) {
    return NextResponse.json(
      {
        ok: false,
        reason: "too_soon",
        ms_until_deadline: msUntilDeadline(lastCheckinAt, checkIntervalHours),
      },
      { status: 200 }
    )
  }

  const message = body?.message
    ? String(body.message).trim().slice(0, 140) || null
    : null

  const now = new Date()

  await db
    .update(users)
    .set({ lastCheckinAt: now, lastCheckinMsg: message })
    .where(eq(users.id, session.userId))

  return NextResponse.json({
    ok: true,
    last_checkin_at: now,
    status: computeStatus(now, checkIntervalHours),
    ms_until_deadline: msUntilDeadline(now, checkIntervalHours),
  })
}

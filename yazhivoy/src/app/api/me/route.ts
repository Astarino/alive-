import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users, sessions, connections } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { requireAuth, deleteSession } from "@/lib/auth"
import { computeStatus, msUntilDeadline } from "@/lib/status"

const VALID_INTERVALS = [12, 24, 48, 72]

export async function GET() {
  const session = await requireAuth()
  const { userId, displayName, checkIntervalHours, lastCheckinAt, lastCheckinMsg } = session

  return NextResponse.json({
    id: userId,
    display_name: displayName,
    check_interval_hours: checkIntervalHours,
    last_checkin_at: lastCheckinAt,
    last_checkin_msg: lastCheckinMsg,
    status: computeStatus(lastCheckinAt, checkIntervalHours),
    ms_until_deadline: msUntilDeadline(lastCheckinAt, checkIntervalHours),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAuth()
  const body = await req.json().catch(() => null)

  const updates: Partial<typeof users.$inferInsert> = {}

  if (body?.display_name != null) {
    const name = String(body.display_name).trim().slice(0, 64)
    if (!name) return NextResponse.json({ error: "Имя не может быть пустым" }, { status: 400 })
    updates.displayName = name
  }

  if (body?.interval_hours != null) {
    const h = Number(body.interval_hours)
    if (!VALID_INTERVALS.includes(h)) {
      return NextResponse.json({ error: "Допустимые интервалы: 12, 24, 48, 72" }, { status: 400 })
    }
    updates.checkIntervalHours = h
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 })
  }

  await db.update(users).set(updates).where(eq(users.id, session.userId))
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await requireAuth()

  // Каскадное удаление через FK ON DELETE CASCADE
  await db.delete(users).where(eq(users.id, session.userId))

  // Cookie уже удалён каскадом через sessions, но явно чистим
  await deleteSession(session.sessionId).catch(() => {})

  return NextResponse.json({ ok: true })
}

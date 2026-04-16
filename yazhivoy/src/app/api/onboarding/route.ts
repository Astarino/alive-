import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"

const VALID_INTERVALS = [12, 24, 48, 72] as const

export async function POST(req: NextRequest) {
  const session = await requireAuth()
  const body = await req.json().catch(() => null)

  const displayName = String(body?.display_name ?? "").trim().slice(0, 64)
  const intervalHours = Number(body?.interval_hours)

  if (!displayName) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 })
  }

  if (!VALID_INTERVALS.includes(intervalHours as (typeof VALID_INTERVALS)[number])) {
    return NextResponse.json({ error: "Допустимые интервалы: 12, 24, 48, 72" }, { status: 400 })
  }

  await db
    .update(users)
    .set({
      displayName,
      checkIntervalHours: intervalHours,
      onboardingDone: true,
    })
    .where(eq(users.id, session.userId))

  return NextResponse.json({ ok: true })
}

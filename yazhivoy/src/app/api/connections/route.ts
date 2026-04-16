import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { connections, users } from "@/lib/db/schema"
import { eq, or, ne, and } from "drizzle-orm"
import { requireAuthAndOnboarding } from "@/lib/auth"
import { computeStatus, msUntilDeadline } from "@/lib/status"

export async function GET() {
  const session = await requireAuthAndOnboarding()
  const myId = session.userId

  const rows = await db
    .select({
      connectionId: connections.id,
      userAId: connections.userAId,
      aliasA: connections.aliasA,
      aliasB: connections.aliasB,
      otherDisplayName: users.displayName,
      otherTelegramUsername: users.telegramUsername,
      otherLastCheckinAt: users.lastCheckinAt,
      otherLastCheckinMsg: users.lastCheckinMsg,
      otherCheckIntervalHours: users.checkIntervalHours,
    })
    .from(connections)
    .innerJoin(
      users,
      and(
        or(eq(connections.userAId, users.id), eq(connections.userBId, users.id)),
        ne(users.id, myId)
      )
    )
    .where(or(eq(connections.userAId, myId), eq(connections.userBId, myId)))

  const friends = rows.map((r) => {
    // Мой псевдоним: если я user_a — мой alias в aliasA, если user_b — в aliasB
    const myAlias = r.userAId === myId ? r.aliasA : r.aliasB
    const status = computeStatus(r.otherLastCheckinAt, r.otherCheckIntervalHours)

    return {
      connection_id: r.connectionId,
      display_name: r.otherDisplayName,       // оригинальное имя друга
      alias: myAlias ?? null,                  // мой псевдоним (null = не задан)
      telegram_username: r.otherTelegramUsername,
      last_checkin_at: r.otherLastCheckinAt,
      last_checkin_msg: r.otherLastCheckinMsg,
      check_interval_hours: r.otherCheckIntervalHours,
      status,
      ms_until_deadline: msUntilDeadline(r.otherLastCheckinAt, r.otherCheckIntervalHours),
    }
  }).sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1
    if (b.status === "overdue" && a.status !== "overdue") return 1
    return 0
  })

  return NextResponse.json(friends)
}

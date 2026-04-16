import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invites, connections } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"
import { requireAuth } from "@/lib/auth"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await requireAuth()
  const { token } = await params

  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1)

  if (!invite) {
    return NextResponse.json({ error: "Ссылка не найдена" }, { status: 404 })
  }
  if (invite.usedAt) {
    return NextResponse.json({ error: "Ссылка уже использована" }, { status: 410 })
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Ссылка истекла" }, { status: 410 })
  }
  if (invite.createdBy === session.userId) {
    return NextResponse.json({ error: "Нельзя принять собственное приглашение" }, { status: 422 })
  }

  // Создать связь (user_a_id < user_b_id)
  const [aId, bId] = [invite.createdBy, session.userId].sort()

  await db
    .insert(connections)
    .values({ userAId: aId, userBId: bId })
    .onConflictDoNothing()

  // Пометить инвайт использованным
  await db
    .update(invites)
    .set({ usedBy: session.userId, usedAt: new Date() })
    .where(eq(invites.id, invite.id))

  return NextResponse.json({ ok: true })
}

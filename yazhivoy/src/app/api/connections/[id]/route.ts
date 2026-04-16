import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { connections } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"
import { requireAuthAndOnboarding } from "@/lib/auth"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAndOnboarding()
  const { id } = await params

  const result = await db
    .delete(connections)
    .where(
      and(
        eq(connections.id, id),
        or(eq(connections.userAId, session.userId), eq(connections.userBId, session.userId))
      )
    )
    .returning({ id: connections.id })

  if (result.length === 0) {
    return NextResponse.json({ error: "Связь не найдена" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuthAndOnboarding()
  const { id } = await params
  const body = await req.json().catch(() => null)

  // alias: строка (новое имя) или null (сбросить к оригинальному)
  const alias = body?.alias != null
    ? String(body.alias).trim().slice(0, 64) || null
    : null

  // Найти связь и убедиться что пользователь её участник
  const [conn] = await db
    .select({ id: connections.id, userAId: connections.userAId })
    .from(connections)
    .where(
      and(
        eq(connections.id, id),
        or(eq(connections.userAId, session.userId), eq(connections.userBId, session.userId))
      )
    )
    .limit(1)

  if (!conn) {
    return NextResponse.json({ error: "Связь не найдена" }, { status: 404 })
  }

  // Записываем в нужную колонку
  const isUserA = conn.userAId === session.userId
  await db
    .update(connections)
    .set(isUserA ? { aliasA: alias } : { aliasB: alias })
    .where(eq(connections.id, id))

  return NextResponse.json({ ok: true, alias })
}

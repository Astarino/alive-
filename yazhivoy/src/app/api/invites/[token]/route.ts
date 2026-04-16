import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invites, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const [invite] = await db
    .select({
      id: invites.id,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
      creatorName: users.displayName,
    })
    .from(invites)
    .innerJoin(users, eq(invites.createdBy, users.id))
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

  return NextResponse.json({ creator_name: invite.creatorName })
}

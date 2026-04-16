import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invites, connections } from "@/lib/db/schema"
import { eq, or, count } from "drizzle-orm"
import { requireAuthAndOnboarding } from "@/lib/auth"
import { nanoid } from "nanoid"
import QRCode from "qrcode"

export async function POST() {
  const session = await requireAuthAndOnboarding()

  // Проверить лимит связей (50)
  const [{ cnt }] = await db
    .select({ cnt: count() })
    .from(connections)
    .where(
      or(
        eq(connections.userAId, session.userId),
        eq(connections.userBId, session.userId)
      )
    )

  if (cnt >= 50) {
    return NextResponse.json(
      { error: "Достигнут максимум связей (50)" },
      { status: 422 }
    )
  }

  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000) // 7 дней

  await db.insert(invites).values({
    token,
    createdBy: session.userId,
    expiresAt,
  })

  const url = `${process.env.SITE_URL}/invite/${token}`
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#e4e4e7", light: "#18181b" },
  })

  return NextResponse.json({ token, url, qr_svg: qrSvg })
}

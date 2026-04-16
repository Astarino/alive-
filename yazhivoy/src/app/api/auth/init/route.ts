import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { authCodes } from "@/lib/db/schema"
import { nanoid } from "nanoid"

export async function POST() {
  const sessionToken = nanoid(32)
  const expiresAt = new Date(Date.now() + 5 * 60_000) // 5 минут

  await db.insert(authCodes).values({ sessionToken, expiresAt })

  const botUsername = process.env.BOT_USERNAME ?? "stillalivee_bot"
  const botUrl = `https://t.me/${botUsername}?start=auth_${sessionToken}`

  return NextResponse.json({ bot_url: botUrl, session_token: sessionToken })
}

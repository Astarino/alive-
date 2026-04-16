import { NextResponse } from "next/server"
import { getSession, deleteSession } from "@/lib/auth"

export async function POST() {
  const session = await getSession()
  if (session) {
    await deleteSession(session.sessionId)
  }
  return NextResponse.json({ ok: true })
}

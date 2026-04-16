import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { sessions, users } from "@/lib/db/schema"
import { eq, gt } from "drizzle-orm"

const COOKIE_NAME = "sid"
const SESSION_TTL_DAYS = 30

export type SessionUser = {
  sessionId: string
  userId: string
  telegramId: number
  displayName: string
  onboardingDone: boolean
  checkIntervalHours: number
  lastCheckinAt: Date | null
  lastCheckinMsg: string | null
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sid = cookieStore.get(COOKIE_NAME)?.value
  if (!sid) return null

  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      telegramId: users.telegramId,
      displayName: users.displayName,
      onboardingDone: users.onboardingDone,
      checkIntervalHours: users.checkIntervalHours,
      lastCheckinAt: users.lastCheckinAt,
      lastCheckinMsg: users.lastCheckinMsg,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sid))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  // Проверяем срок действия отдельным запросом не нужен — хранится в таблице
  const sessionRows = await db
    .select({ expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.id, sid))
    .limit(1)

  if (!sessionRows[0] || sessionRows[0].expiresAt < new Date()) return null

  return row
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

export async function requireAuthAndOnboarding(): Promise<SessionUser> {
  const session = await requireAuth()
  if (!session.onboardingDone) redirect("/onboarding")
  return session
}

export async function createSession(
  userId: string
): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)

  const [session] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning({ id: sessions.id })

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
    sameSite: "strict",
    maxAge: SESSION_TTL_DAYS * 24 * 3600,
    path: "/",
  })

  return session.id
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sid))
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

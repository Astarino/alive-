import { requireAuthAndOnboarding } from "@/lib/auth"
import { CheckinButton } from "@/components/CheckinButton"
import { Countdown } from "@/components/Countdown"
import { FriendsList } from "@/components/FriendsList"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq, and, isNotNull, sql } from "drizzle-orm"
import Link from "next/link"

async function getAliveCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        eq(users.onboardingDone, true),
        isNotNull(users.lastCheckinAt),
        sql`${users.lastCheckinAt} + (${users.checkIntervalHours} || ' hours')::interval > now()`
      )
    )
  return row?.count ?? 0
}

export default async function HomePage() {
  const session = await requireAuthAndOnboarding()
  const { displayName, lastCheckinAt, checkIntervalHours } = session

  const deadlineMs = lastCheckinAt
    ? lastCheckinAt.getTime() + checkIntervalHours * 3600 * 1000
    : null

  const aliveCount = await getAliveCount()

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      <header className="w-full max-w-sm flex justify-between items-center mb-12">
        <span className="text-zinc-400 text-sm font-medium">{displayName}</span>
        <Link href="/settings" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          настройки
        </Link>
      </header>

      <main className="flex flex-col items-center gap-6 mb-16">
        <CheckinButton lastCheckinMs={lastCheckinAt?.getTime() ?? null} />
        <Countdown deadlineMs={deadlineMs} />
        <p className="text-zinc-600 text-xs">
          живых прямо сейчас: <span className="text-zinc-400">{aliveCount}</span>
        </p>
      </main>

      <section className="w-full max-w-sm">
        <h2 className="text-zinc-500 text-xs uppercase tracking-widest mb-3">друзья</h2>
        <FriendsList />
      </section>
    </div>
  )
}

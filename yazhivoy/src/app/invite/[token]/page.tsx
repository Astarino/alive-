import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { invites, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { AcceptInviteButton } from "./AcceptInviteButton"

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
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

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-zinc-400 mb-4">Ссылка недействительна или уже использована</p>
        <Link href="/" className="text-emerald-500 hover:text-emerald-400 text-sm">
          на главную
        </Link>
      </div>
    )
  }

  const session = await getSession()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs text-center">
        <h1 className="text-2xl font-semibold mb-2">приглашение</h1>
        <p className="text-zinc-400 mb-8">
          <span className="text-zinc-100 font-medium">{invite.creatorName}</span> хочет видеть твой статус
        </p>

        <AcceptInviteButton token={token} isLoggedIn={!!session} />

        {!session && (
          <p className="text-zinc-500 text-xs mt-4">
            нужно войти через Telegram
          </p>
        )}
      </div>
    </div>
  )
}

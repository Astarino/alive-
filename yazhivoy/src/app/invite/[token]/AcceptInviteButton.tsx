"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function AcceptInviteButton({
  token,
  isLoggedIn,
}: {
  token: string
  isLoggedIn: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handle() {
    if (!isLoggedIn) {
      localStorage.setItem("pending_invite", token)
      router.push("/login")
      return
    }

    setLoading(true)
    const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Что-то пошло не так")
      return
    }

    router.push("/")
  }

  return (
    <>
      <button
        onClick={handle}
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white rounded-lg py-3 font-medium transition-colors"
      >
        {loading ? "принимаю…" : isLoggedIn ? "принять и перейти" : "войти и принять"}
      </button>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </>
  )
}

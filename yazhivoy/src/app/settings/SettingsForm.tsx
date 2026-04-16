"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const INTERVALS = [12, 24, 48, 72]

export function SettingsForm({
  initialName,
  initialInterval,
}: {
  initialName: string
  initialInterval: number
}) {
  const [name, setName] = useState(initialName)
  const [interval, setInterval] = useState(initialInterval)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name, interval_hours: interval }),
    })

    setSaving(false)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error || "Ошибка")
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  async function handleDelete() {
    if (!confirm("Удалить аккаунт? Это действие необратимо.")) return
    await fetch("/api/me", { method: "DELETE" })
    router.push("/login")
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">имя</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 64))}
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-3">интервал отметки</label>
          <div className="grid grid-cols-4 gap-2">
            {INTERVALS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setInterval(h)}
                className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                  interval === h
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {h}ч
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-lg py-2.5 font-medium transition-colors"
        >
          {saving ? "сохраняю…" : saved ? "сохранено ✓" : "сохранить"}
        </button>
      </form>

      <div className="border-t border-zinc-800 pt-6 space-y-3">
        <Link
          href="/"
          className="block w-full text-center text-zinc-500 hover:text-zinc-300 text-sm transition-colors py-2"
        >
          ← назад
        </Link>
        <button
          onClick={handleLogout}
          className="w-full text-zinc-500 hover:text-zinc-300 text-sm transition-colors py-2"
        >
          выйти
        </button>
        <button
          onClick={handleDelete}
          className="w-full text-red-500/60 hover:text-red-400 text-sm transition-colors py-2"
        >
          удалить аккаунт
        </button>
      </div>
    </div>
  )
}

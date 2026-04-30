"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/lib/auth"

const INTERVALS = [
  { value: 12, label: "каждые 12 ч",  desc: "дважды в день" },
  { value: 24, label: "каждые 24 ч",  desc: "раз в день" },
  { value: 48, label: "каждые 48 ч",  desc: "раз в два дня" },
  { value: 72, label: "каждые 72 ч",  desc: "раз в три дня" },
]

export default function OnboardingPage() {
  const [name, setName] = useState("")
  const [interval, setInterval] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [consentGiven, setConsentGiven] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!interval) return
    setError("")
    setLoading(true)

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name, interval_hours: interval }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Что-то пошло не так")
      return
    }

    router.push("/")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-semibold mb-1 text-center">добро пожаловать</h1>
        <p className="text-zinc-400 text-sm text-center mb-8">настроим пару вещей</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">как тебя зовут</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 64))}
              placeholder="Иван"
              required
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-3">
              как часто будешь отмечаться
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INTERVALS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setInterval(opt.value)}
                  className={`
                    flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all
                    ${interval === opt.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"}
                  `}
                >
                  <span className="font-medium text-sm">{opt.label}</span>
                  <span className="text-xs text-zinc-500 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
            />
            <span className="text-xs text-zinc-400 leading-relaxed">
              Я принимаю{" "}
              <Link href="/privacy" className="text-emerald-500 underline" target="_blank">
                политику обработки персональных данных
              </Link>{" "}
              и даю{" "}
              <Link href="/consent" className="text-emerald-500 underline" target="_blank">
                согласие на обработку персональных данных
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !name.trim() || !interval || !consentGiven}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg py-2.5 font-medium transition-colors"
          >
            {loading ? "сохраняю…" : "начать"}
          </button>
        </form>
      </div>
    </div>
  )
}

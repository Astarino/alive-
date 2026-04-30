"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
        expand: () => void
      }
    }
  }
}

type Step = "start" | "waiting" | "expired" | "tg-loading"

const POLL_INTERVAL_MS = 2000
const TIMEOUT_MS = 5 * 60 * 1000 // 5 минут

export default function LoginPage() {
  const [step, setStep] = useState<Step>("start")
  const [sessionToken, setSessionToken] = useState("")
  const [botUrl, setBotUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(300)
  const [showHint, setShowHint] = useState(false)
  const router = useRouter()

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hintRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Авто-логин через Mini App
  useEffect(() => {
    function tryTgAuth() {
      const twa = window.Telegram?.WebApp
      if (!twa?.initData) return false

      twa.ready()
      twa.expand()
      setStep("tg-loading")

      fetch("/api/auth/telegram-webapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_data: twa.initData }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.onboarding_done !== undefined) {
            router.push(data.onboarding_done ? "/" : "/onboarding")
          } else {
            setError(data.error || "Ошибка входа")
            setStep("start")
          }
        })
        .catch(() => {
          setError("Нет связи с сервером")
          setStep("start")
        })

      return true
    }

    // SDK мог ещё не инициализировать initData в момент mount — даём 300 мс
    if (!tryTgAuth()) {
      const t = setTimeout(tryTgAuth, 300)
      return () => clearTimeout(t)
    }
  }, [router])

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (hintRef.current) clearTimeout(hintRef.current)
  }

  useEffect(() => () => stopPolling(), [])

  async function startPolling(token: string) {
    setSecondsLeft(300)
    setShowHint(false)
    hintRef.current = setTimeout(() => setShowHint(true), 10_000)

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)

    timeoutRef.current = setTimeout(() => {
      stopPolling()
      setStep("expired")
    }, TIMEOUT_MS)

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/poll?session_token=${token}`)
        const data = await res.json()

        if (data.ok) {
          stopPolling()
          const pendingInvite = localStorage.getItem("pending_invite")
          if (pendingInvite) {
            localStorage.removeItem("pending_invite")
            await fetch(`/api/invites/${pendingInvite}/accept`, { method: "POST" })
          }
          router.push(data.onboarding_done ? "/" : "/onboarding")
        }
      } catch {
        // сетевые ошибки игнорируем, продолжаем polling
      }
    }, POLL_INTERVAL_MS)
  }

  async function handleLogin() {
    setError("")
    setLoading(true)

    const res = await fetch("/api/auth/init", { method: "POST" })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || "Что-то пошло не так")
      return
    }

    setSessionToken(data.session_token)
    setBotUrl(data.bot_url)

    window.open(data.bot_url, "_blank")

    setStep("waiting")
    startPolling(data.session_token)
  }

  function handleRetry() {
    stopPolling()
    setStep("start")
    setSessionToken("")
    setBotUrl("")
    setError("")
    setShowHint(false)
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <h1 className="text-2xl font-semibold mb-1 text-center">яживой</h1>
        <p className="text-zinc-400 text-sm text-center mb-8">вход через Telegram</p>

        {step === "tg-loading" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-emerald-500 animate-spin" />
            <p className="text-sm text-zinc-400 text-center">Входим через Telegram…</p>
          </div>
        )}

        {step === "start" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400 text-center">
              Откроется бот — нажми Start, и вход выполнится автоматически
            </p>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

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
              onClick={handleLogin}
              disabled={loading || !consentGiven}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                "подключаюсь…"
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.31l-2.945-.92c-.64-.203-.658-.64.135-.954l11.566-4.46c.537-.194 1.006.131.968.245z"/>
                  </svg>
                  войти через Telegram
                </>
              )}
            </button>
          </div>
        )}

        {step === "waiting" && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-emerald-500 animate-spin" />
              <p className="text-sm text-zinc-300 text-center">
                Ожидаем подтверждения в Telegram…
              </p>
              <p className="text-xs text-zinc-600 text-center">
                Нажми <span className="text-zinc-400">Start</span> в боте — вход выполнится сам
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.open(botUrl, "_blank")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.31l-2.945-.92c-.64-.203-.658-.64.135-.954l11.566-4.46c.537-.194 1.006.131.968.245z"/>
                </svg>
                открыть бота
              </button>

              {showHint && (
                <p className="text-xs text-zinc-500 text-center">
                  если Telegram не открылся автоматически — нажми кнопку выше
                </p>
              )}

              <p className="text-xs text-zinc-600 text-center">
                ссылка действует {minutes}:{String(seconds).padStart(2, "0")}
              </p>
            </div>

            <button
              onClick={handleRetry}
              className="w-full text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
            >
              отмена
            </button>
          </div>
        )}

        {step === "expired" && (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <p className="text-sm text-zinc-300">Время вышло. Попробуй войти снова.</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-3 font-medium transition-colors"
            >
              попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

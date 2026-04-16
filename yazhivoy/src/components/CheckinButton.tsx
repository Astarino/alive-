"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type State = "idle" | "cooldown" | "expanding" | "loading" | "success"

const COOLDOWN_MS = 60 * 60 * 1000 // 1 час

function formatCooldown(ms: number): string {
  if (ms <= 0) return ""
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m > 0) return `${m} мин ${s} сек`
  return `${s} сек`
}

export function CheckinButton({ lastCheckinMs }: { lastCheckinMs: number | null }) {
  // Локальный ref обновляется сразу при чекине, не ждёт router.refresh()
  const checkedInAt = useRef<number | null>(lastCheckinMs)

  const [state, setState] = useState<State>(() => {
    if (lastCheckinMs == null) return "idle"
    return Date.now() - lastCheckinMs < COOLDOWN_MS ? "cooldown" : "idle"
  })
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const [showMsg, setShowMsg] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  // Синхронизируем ref когда приходят новые пропсы (после router.refresh)
  useEffect(() => {
    checkedInAt.current = lastCheckinMs
  }, [lastCheckinMs])

  // Живой счётчик cooldown
  useEffect(() => {
    if (state !== "cooldown") return

    const tick = () => {
      const t = checkedInAt.current
      if (t == null) { setState("idle"); return }
      const left = COOLDOWN_MS - (Date.now() - t)
      if (left <= 0) {
        setState("idle")
        setCooldownLeft(0)
      } else {
        setCooldownLeft(left)
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [state])

  async function handleClick() {
    if (state === "loading" || state === "success" || state === "cooldown") return

    if (!showMsg) {
      setShowMsg(true)
      setState("expanding")
      return
    }

    setState("loading")

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message || undefined }),
    })

    const data = await res.json()

    if (data.reason === "too_soon") {
      setShowMsg(false)
      setMessage("")
      setState("cooldown")
      router.refresh()
      return
    }

    // Обновляем ref сразу — не ждём router.refresh
    checkedInAt.current = Date.now()

    setState("success")
    setShowMsg(false)
    setMessage("")
    router.refresh()

    // После анимации успеха → cooldown (не idle!)
    setTimeout(() => setState("cooldown"), 2000)
  }

  const buttonLabel =
    state === "loading"  ? "отмечаюсь…" :
    state === "success"  ? "отмечено ✓"  :
    state === "cooldown" ? "я жив ✓"     :
    showMsg              ? "подтвердить" :
                           "я жив"

  const buttonColor =
    state === "success"  ? "bg-emerald-600" :
    state === "cooldown" ? "bg-zinc-700 cursor-default" :
    state === "loading"  ? "bg-zinc-700" :
                           "bg-emerald-500 hover:bg-emerald-400 active:scale-95"

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
      <div className="relative flex items-center justify-center">
        {(state === "idle" || state === "expanding") && (
          <span className="pulse-ring absolute w-32 h-32 rounded-full text-emerald-500 pointer-events-none" />
        )}
        <button
          onClick={handleClick}
          disabled={state === "loading" || state === "cooldown"}
          className={`
            relative z-10 w-32 h-32 rounded-full text-white font-semibold text-lg
            transition-all duration-200 select-none
            ${buttonColor}
          `}
        >
          {buttonLabel}
        </button>
      </div>

      {state === "cooldown" && cooldownLeft > 0 && (
        <p className="text-xs text-zinc-500 text-center">
          снова через {formatCooldown(cooldownLeft)}
        </p>
      )}

      {showMsg && state !== "success" && state !== "cooldown" && (
        <div className="w-full flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 140))}
            placeholder="добавить сообщение (необязательно)"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-600">{message.length}/140</span>
            <button
              onClick={() => { setShowMsg(false); setState("idle") }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

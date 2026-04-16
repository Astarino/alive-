"use client"

import { useEffect, useState } from "react"

function formatMs(ms: number): string {
  if (ms <= 0) return "просрочено"
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин ${s} сек`
  return `${s} сек`
}

export function Countdown({ deadlineMs }: { deadlineMs: number | null }) {
  const [remaining, setRemaining] = useState<number | null>(
    deadlineMs != null ? deadlineMs - Date.now() : null
  )

  useEffect(() => {
    if (deadlineMs == null) return
    const tick = () => setRemaining(deadlineMs - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineMs])

  if (remaining == null) return <span className="text-zinc-500">нет данных</span>
  if (remaining <= 0)
    return <span className="text-red-400 font-medium">просрочено</span>

  const urgent = remaining < 6 * 3600 * 1000
  return (
    <span className={urgent ? "text-amber-400 font-medium" : "text-zinc-400"}>
      осталось {formatMs(remaining)}
    </span>
  )
}

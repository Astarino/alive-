"use client"

import type { UserStatus } from "@/lib/status"

const config: Record<UserStatus, { label: string; color: string }> = {
  alive:   { label: "жив",         color: "bg-emerald-500" },
  overdue: { label: "не отвечает", color: "bg-red-500" },
  new:     { label: "не начал",    color: "bg-zinc-500" },
}

export function StatusBadge({ status }: { status: UserStatus }) {
  const { label, color } = config[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-sm text-zinc-400">{label}</span>
    </span>
  )
}

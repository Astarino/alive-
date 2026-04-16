"use client"

import { useEffect, useState } from "react"
import { StatusBadge } from "./StatusBadge"
import type { UserStatus } from "@/lib/status"

type Friend = {
  connection_id: string
  display_name: string   // оригинальное имя
  alias: string | null   // мой псевдоним (null = не задан)
  telegram_username: string | null
  last_checkin_at: string | null
  last_checkin_msg: string | null
  check_interval_hours: number
  status: UserStatus
  ms_until_deadline: number | null
}

type InviteData = {
  url: string
  qr_svg: string
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "никогда"
  const ms = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return "только что"
  if (h < 24) return `${h} ч назад`
  return `${Math.floor(h / 24)} дн назад`
}

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[] | null>(null)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  async function loadFriends() {
    const res = await fetch("/api/connections")
    if (res.ok) setFriends(await res.json())
  }

  useEffect(() => {
    loadFriends()
    const id = setInterval(loadFriends, 30_000)
    return () => clearInterval(id)
  }, [])

  async function handleCreateInvite() {
    setInviteLoading(true)
    setInviteError("")
    const res = await fetch("/api/invites", { method: "POST" })
    const data = await res.json()
    setInviteLoading(false)
    if (!res.ok) {
      setInviteError(data.error || "Не удалось создать ссылку")
      return
    }
    setInvite({ url: data.url, qr_svg: data.qr_svg })
  }

  async function handleCopy() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
    } catch {
      // fallback для браузеров без clipboard API
      const el = document.createElement("textarea")
      el.value = invite.url
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete(connectionId: string) {
    if (!confirm("Удалить связь? Оба перестанете видеть друг друга.")) return
    setDeleting(connectionId)
    await fetch(`/api/connections/${connectionId}`, { method: "DELETE" })
    await loadFriends()
    setDeleting(null)
  }

  function startEdit(f: Friend) {
    setEditingId(f.connection_id)
    setEditValue(f.alias ?? f.display_name)
  }

  async function saveAlias(connectionId: string, displayName: string) {
    const trimmed = editValue.trim()
    // null = сброс к оригиналу, если ввели то же что оригинал или пусто
    const alias = !trimmed || trimmed === displayName ? null : trimmed
    setEditingId(null)
    // Оптимистично обновляем UI
    setFriends(prev => prev?.map(f =>
      f.connection_id === connectionId ? { ...f, alias } : f
    ) ?? null)
    await fetch(`/api/connections/${connectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias }),
    })
  }

  function handleEditKeyDown(e: React.KeyboardEvent, connectionId: string, displayName: string) {
    if (e.key === "Enter") { e.preventDefault(); saveAlias(connectionId, displayName) }
    if (e.key === "Escape") setEditingId(null)
  }

  if (friends === null) {
    return <p className="text-zinc-500 text-sm">загрузка…</p>
  }

  const aliveCount = friends.filter(f => f.status === "alive").length

  return (
    <div className="w-full max-w-sm space-y-2">
      {/* Счётчик живых среди друзей */}
      {friends.length > 0 && (
        <p className="text-zinc-600 text-xs mb-1">
          живых: <span className="text-zinc-400">{aliveCount} из {friends.length}</span>
        </p>
      )}

      {/* Список друзей */}
      {friends.length === 0 && !invite && (
        <p className="text-zinc-500 text-sm text-center pb-2">
          пока никого нет
        </p>
      )}

      {friends.map((f) => (
        <div
          key={f.connection_id}
          className="flex items-start justify-between gap-3 bg-zinc-900 rounded-xl px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {editingId === f.connection_id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value.slice(0, 64))}
                  onBlur={() => saveAlias(f.connection_id, f.display_name)}
                  onKeyDown={e => handleEditKeyDown(e, f.connection_id, f.display_name)}
                  className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-400 min-w-0"
                  placeholder={f.display_name}
                />
              ) : (
                <button
                  onClick={() => startEdit(f)}
                  className="group flex items-center gap-1.5 min-w-0"
                  title="нажми чтобы изменить имя"
                >
                  <span className="font-medium text-zinc-100 truncate">
                    {f.alias ?? f.display_name}
                  </span>
                  {f.alias && (
                    <span className="text-xs text-zinc-600 truncate hidden group-hover:inline">
                      ({f.display_name})
                    </span>
                  )}
                  <svg className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              <StatusBadge status={f.status} />
            </div>
            <p className="text-xs text-zinc-500">{timeAgo(f.last_checkin_at)}</p>
            {f.last_checkin_msg && (
              <p className="text-xs text-zinc-400 mt-1 italic truncate">«{f.last_checkin_msg}»</p>
            )}
          </div>
          <button
            onClick={() => handleDelete(f.connection_id)}
            disabled={deleting === f.connection_id}
            className="text-zinc-600 hover:text-red-400 transition-colors text-xl leading-none mt-0.5 flex-shrink-0"
            title="удалить связь"
          >
            ×
          </button>
        </div>
      ))}

      {/* Карточка инвайта */}
      {invite ? (
        <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <p className="text-xs text-zinc-400 text-center">
            отправь ссылку или покажи QR-код другу
          </p>

          {/* QR */}
          <div
            className="flex justify-center [&_svg]:w-44 [&_svg]:h-44 [&_svg]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: invite.qr_svg }}
          />

          {/* Ссылка + кнопка копировать */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 overflow-hidden">
              <p className="text-xs text-zinc-400 truncate">{invite.url}</p>
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
            >
              {copied ? "✓ скопировано" : "копировать"}
            </button>
          </div>

          <p className="text-xs text-zinc-600 text-center">
            одноразовая · действует 7 дней
          </p>

          <button
            onClick={() => setInvite(null)}
            className="w-full text-zinc-500 hover:text-zinc-300 text-xs py-1 transition-colors"
          >
            закрыть
          </button>
        </div>
      ) : (
        <>
          {inviteError && (
            <p className="text-red-400 text-xs text-center">{inviteError}</p>
          )}
          <button
            onClick={handleCreateInvite}
            disabled={inviteLoading}
            className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {inviteLoading ? "создаю ссылку…" : "+ добавить друга"}
          </button>
        </>
      )}
    </div>
  )
}

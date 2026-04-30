"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem("cookie_consent", "1")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-lg mx-auto bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-xl">
        <p className="text-sm text-zinc-300 mb-3">
          Сервис использует файлы cookie для хранения сессии авторизации.
          Используя сайт, вы соглашаетесь с{" "}
          <Link href="/privacy" className="text-emerald-500 underline">
            политикой обработки персональных данных
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Понятно
        </button>
      </div>
    </div>
  )
}

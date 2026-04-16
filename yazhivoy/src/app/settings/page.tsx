import { requireAuth } from "@/lib/auth"
import { SettingsForm } from "./SettingsForm"

export default async function SettingsPage() {
  const session = await requireAuth()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-semibold mb-8 text-center">настройки</h1>
        <SettingsForm
          initialName={session.displayName}
          initialInterval={session.checkIntervalHours}
        />
      </div>
    </div>
  )
}

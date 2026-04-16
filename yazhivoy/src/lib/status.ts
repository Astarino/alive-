export type UserStatus = "alive" | "overdue" | "new"

export function computeStatus(
  lastCheckinAt: Date | null,
  checkIntervalHours: number
): UserStatus {
  if (!lastCheckinAt) return "new"
  const deadlineMs = lastCheckinAt.getTime() + checkIntervalHours * 3600 * 1000
  return deadlineMs > Date.now() ? "alive" : "overdue"
}

export function deadlineDate(
  lastCheckinAt: Date | null,
  checkIntervalHours: number
): Date | null {
  if (!lastCheckinAt) return null
  return new Date(lastCheckinAt.getTime() + checkIntervalHours * 3600 * 1000)
}

export function msUntilDeadline(
  lastCheckinAt: Date | null,
  checkIntervalHours: number
): number | null {
  const deadline = deadlineDate(lastCheckinAt, checkIntervalHours)
  if (!deadline) return null
  return deadline.getTime() - Date.now()
}

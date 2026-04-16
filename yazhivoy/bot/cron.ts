import cron from "node-cron"
import { sql } from "drizzle-orm"
import { bot, db } from "./shared"

const siteUrl = process.env.SITE_URL || "https://stillalivee.ru"

function formatHours(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  if (h < 1) return "меньше часа"
  if (h < 24) return `${h} ч`
  return `${Math.floor(h / 24)} дн ${h % 24} ч`
}

// ── напоминания ────────────────────────────────────────────────────────────
// Каждые 15 минут: дедлайн наступит через ≤ 6 часов
cron.schedule("*/15 * * * *", async () => {
  try {
    const rows = await db.execute(sql`
      SELECT u.id, u.telegram_id, u.display_name,
             (u.last_checkin_at + (u.check_interval_hours || ' hours')::interval) AS deadline
      FROM users u
      WHERE u.last_checkin_at IS NOT NULL
        AND (u.last_checkin_at + (u.check_interval_hours || ' hours')::interval) > now()
        AND (u.last_checkin_at + (u.check_interval_hours || ' hours')::interval) <= now() + interval '6 hours'
        AND NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.user_id = u.id
            AND nl.type = 'reminder'
            AND nl.deadline_ts = (u.last_checkin_at + (u.check_interval_hours || ' hours')::interval)
        )
    `)

    for (const row of rows as any[]) {
      try {
        const msLeft = new Date(row.deadline).getTime() - Date.now()
        const hLeft = Math.ceil(msLeft / 3_600_000)

        await bot.api.sendMessage(
          Number(row.telegram_id),
          `⏰ <b>Напоминание</b>\n\n` +
          `До дедлайна осталось <b>${hLeft} ч</b>!\n` +
          `Отметься здесь: /checkin\n` +
          `Или на сайте: ${siteUrl}`,
          { parse_mode: "HTML" }
        )

        await db.execute(sql`
          INSERT INTO notification_log (user_id, type, deadline_ts)
          VALUES (${row.id}, 'reminder', ${row.deadline})
          ON CONFLICT DO NOTHING
        `)
      } catch (err) {
        console.error(`[cron:reminder] telegram_id=${row.telegram_id}:`, err)
      }
    }
  } catch (err) {
    console.error("[cron:reminder]", err)
  }
})

// ── просрочки ──────────────────────────────────────────────────────────────
// Каждые 5 минут: дедлайн уже прошёл — уведомить друзей
cron.schedule("*/5 * * * *", async () => {
  try {
    const rows = await db.execute(sql`
      SELECT u.id, u.telegram_id, u.display_name,
             (u.last_checkin_at + (u.check_interval_hours || ' hours')::interval) AS deadline
      FROM users u
      WHERE u.last_checkin_at IS NOT NULL
        AND (u.last_checkin_at + (u.check_interval_hours || ' hours')::interval) <= now()
        AND NOT EXISTS (
          SELECT 1 FROM notification_log nl
          WHERE nl.user_id = u.id
            AND nl.type = 'overdue'
            AND nl.deadline_ts = (u.last_checkin_at + (u.check_interval_hours || ' hours')::interval)
        )
    `)

    for (const row of rows as any[]) {
      const overdueMs = Date.now() - new Date(row.deadline).getTime()

      // Найти всех друзей
      const friends = await db.execute(sql`
        SELECT u.telegram_id, u.display_name
        FROM connections c
        JOIN users u ON (
          CASE WHEN c.user_a_id = ${row.id}::uuid THEN c.user_b_id ELSE c.user_a_id END = u.id
        )
        WHERE c.user_a_id = ${row.id}::uuid OR c.user_b_id = ${row.id}::uuid
      `)

      for (const friend of friends as any[]) {
        try {
          await bot.api.sendMessage(
            Number(friend.telegram_id),
            `🔴 <b>${row.display_name}</b> не отвечает\n\n` +
            `Прошло уже <b>${formatHours(overdueMs)}</b> с последней отметки.`,
            { parse_mode: "HTML" }
          )
        } catch (err) {
          console.error(`[cron:overdue] notify friend ${friend.telegram_id}:`, err)
        }
      }

      // Также уведомить самого пользователя
      try {
        await bot.api.sendMessage(
          Number(row.telegram_id),
          `🔴 <b>Дедлайн просрочен!</b>\n\n` +
          `Прошло ${formatHours(overdueMs)} — твои друзья получили уведомление.\n` +
          `Отметься: /checkin`,
          { parse_mode: "HTML" }
        )
      } catch (err) {
        console.error(`[cron:overdue] notify self ${row.telegram_id}:`, err)
      }

      await db.execute(sql`
        INSERT INTO notification_log (user_id, type, deadline_ts)
        VALUES (${row.id}, 'overdue', ${row.deadline})
        ON CONFLICT DO NOTHING
      `)
    }
  } catch (err) {
    console.error("[cron:overdue]", err)
  }
})

console.log("Cron jobs started")

import {
  pgTable,
  uuid,
  bigint,
  varchar,
  smallint,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramId: bigint("telegram_id", { mode: "number" }).unique().notNull(),
  telegramUsername: varchar("telegram_username", { length: 64 }),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  checkIntervalHours: smallint("check_interval_hours").notNull().default(48),
  lastCheckinAt: timestamp("last_checkin_at", { withTimezone: true }),
  lastCheckinMsg: varchar("last_checkin_msg", { length: 140 }),
  onboardingDone: boolean("onboarding_done").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aliasA: varchar("alias_a", { length: 64 }), // псевдоним user_a для user_b
    aliasB: varchar("alias_b", { length: 64 }), // псевдоним user_b для user_a
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("connections_pair_idx").on(t.userAId, t.userBId),
    index("connections_user_a_idx").on(t.userAId),
    index("connections_user_b_idx").on(t.userBId),
    check("connections_order_check", sql`${t.userAId} < ${t.userBId}`),
  ]
)

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: varchar("token", { length: 32 }).unique().notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  usedBy: uuid("used_by").references(() => users.id),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const authCodes = pgTable("auth_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: varchar("session_token", { length: 32 }).unique(),
  telegramId: bigint("telegram_id", { mode: "number" }),
  code: varchar("code", { length: 6 }),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 16 }).notNull(), // 'reminder' | 'overdue'
    deadlineTs: timestamp("deadline_ts", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("notification_log_dedup_idx").on(t.userId, t.type, t.deadlineTs),
    index("notification_log_user_idx").on(t.userId),
  ]
)

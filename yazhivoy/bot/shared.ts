import { Bot } from "grammy"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "../src/lib/db/schema"

if (!process.env.BOT_TOKEN) throw new Error("BOT_TOKEN is not set")
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")

export const bot = new Bot(process.env.BOT_TOKEN)

const client = postgres(process.env.DATABASE_URL)
export const db = drizzle(client, { schema })

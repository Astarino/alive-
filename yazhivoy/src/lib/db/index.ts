import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL!

// Для миграций нужен один коннект, для запросов — пул
const client = postgres(connectionString, { max: 10 })

export const db = drizzle(client, { schema })

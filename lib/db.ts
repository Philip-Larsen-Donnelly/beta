import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Please add it to your environment.")
}

const ssl =
  process.env.DATABASE_SSL === "true"
    ? {
        rejectUnauthorized: false,
      }
    : undefined

export const pool = new Pool({
  connectionString,
  ssl,
})

export function query<T = unknown>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params)
}


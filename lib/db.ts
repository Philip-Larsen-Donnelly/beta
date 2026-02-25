import { Pool } from "pg"

let pool: Pool | null = null

function getPool() {
  if (pool) return pool

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

  pool = new Pool({
    connectionString,
    ssl,
  })

  return pool
}

export function query<T = unknown>(text: string, params?: unknown[]) {
  return getPool().query<T>(text, params)
}


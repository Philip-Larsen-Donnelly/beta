import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { randomUUID, randomBytes } from "crypto"
import { compare, hash } from "bcryptjs"
import type { Profile } from "./types"
import { query } from "./db"

const SESSION_COOKIE = "session_token"
const SESSION_TTL_DAYS = 30

function sessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
}

async function setSessionCookie(token: string, expires: Date) {
  const cookieStore = await cookies()
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  })
}

async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    expires: new Date(0),
  })
}

export async function createSession(userId: string) {
  const token = `${randomUUID()}-${randomBytes(16).toString("hex")}`
  const expiresAt = sessionExpiry()
  await query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expiresAt.toISOString()],
  )
  await setSessionCookie(token, expiresAt)
}

export async function deleteSession(token: string) {
  await query("DELETE FROM sessions WHERE token = $1", [token])
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const { rows } = await query<Profile & { expires_at: string }>(
    `SELECT p.*, s.expires_at
     FROM sessions s
     JOIN profiles p ON p.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [token],
  )

  if (!rows[0]) {
    await clearSessionCookie()
    return null
  }

  return rows[0]
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect("/auth/login")
  }
  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile()
  if (!profile.is_admin) {
    redirect("/guidelines")
  }
  return profile
}

export async function signOutSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (token) {
    await deleteSession(token)
  }
  await clearSessionCookie()
}

export async function hashPassword(password: string) {
  return hash(password, 10)
}

export async function verifyPassword(password: string, hashed: string) {
  return compare(password, hashed)
}


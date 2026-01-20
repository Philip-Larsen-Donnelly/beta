"use server"

import { redirect } from "next/navigation"
import { query } from "@/lib/db"
import { createSession, signOutSession, hashPassword, verifyPassword } from "@/lib/auth"

export async function signIn(formData: FormData) {
  const username = (formData.get("username") as string).toLowerCase()
  const password = formData.get("password") as string

  const { rows } = await query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM profiles WHERE username = $1",
    [username],
  )

  const user = rows[0]
  if (!user) return { error: "Invalid username or password" }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return { error: "Invalid username or password" }

  await createSession(user.id)
  redirect("/guidelines")
}

export async function signUp(formData: FormData) {
  const username = (formData.get("username") as string).toLowerCase()
  const email = (formData.get("email") as string).toLowerCase()
  const password = formData.get("password") as string
  const organisation = (formData.get("organisation") as string | null)?.trim() || null

  // Uniqueness checks
  const { rows: existingUsername } = await query("SELECT id FROM profiles WHERE username = $1", [username])
  if (existingUsername.length > 0) return { error: "Username is already taken" }

  const { rows: existingEmail } = await query("SELECT id FROM profiles WHERE email = $1", [email])
  if (existingEmail.length > 0) return { error: "Email is already registered" }

  const hashed = await hashPassword(password)
  const { rows } = await query<{ id: string }>(
    `INSERT INTO profiles (username, email, display_name, organisation, password_hash, is_admin)
     VALUES ($1, $2, $3, $4, $5, false)
     RETURNING id`,
    [username, email, username, organisation, hashed],
  )

  const newUser = rows[0]
  if (!newUser) return { error: "Failed to create user" }

  await createSession(newUser.id)
  redirect("/guidelines")
}

export async function signOut() {
  await signOutSession()
  redirect("/auth/login")
}

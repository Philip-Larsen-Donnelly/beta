import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getCurrentProfile } from "@/lib/auth"

async function requireUser() {
  const profile = await getCurrentProfile()
  if (!profile) {
    return { profile: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { profile, response: null }
}

export async function GET(req: Request) {
  try {
    const { profile, response } = await requireUser()
    if (!profile) return response

    const url = new URL(req.url)
    const bugId = url.searchParams.get("bugId")
    if (!bugId) {
      return NextResponse.json({ error: "bugId is required" }, { status: 400 })
    }

    const { rows } = await query(
      `SELECT bc.*,
              p.display_name AS profile_display_name,
              p.email AS profile_email
       FROM bug_comments bc
       LEFT JOIN profiles p ON p.id = bc.user_id
       WHERE bc.bug_id = $1
       ORDER BY bc.created_at ASC`,
      [bugId],
    )

    const comments = rows.map((row) => ({
      id: row.id,
      bug_id: row.bug_id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      profile:
        row.profile_display_name !== null || row.profile_email !== null
          ? { display_name: row.profile_display_name, email: row.profile_email }
          : null,
    }))

    return NextResponse.json(comments)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { profile, response } = await requireUser()
    if (!profile) return response

    const body = await req.json()
    const bugId = body.bugId as string | undefined
    const content = (body.content as string | undefined)?.trim()

    if (!bugId || !content) {
      return NextResponse.json({ error: "bugId and content are required" }, { status: 400 })
    }

    const { rows } = await query(
      `INSERT INTO bug_comments (bug_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [bugId, profile.id, content],
    )

    const row = rows[0]
    const comment = {
      id: row.id,
      bug_id: row.bug_id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      profile: { display_name: profile.display_name, email: profile.email },
    }

    return NextResponse.json(comment)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

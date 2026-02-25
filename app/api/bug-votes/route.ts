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

    const [{ rows: countRows }, { rows: voteRows }] = await Promise.all([
      query<{ count: string }>("SELECT COUNT(*)::text AS count FROM bug_votes WHERE bug_id = $1", [bugId]),
      query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM bug_votes WHERE bug_id = $1 AND user_id = $2) AS exists",
        [bugId, profile.id],
      ),
    ])

    const count = Number.parseInt(countRows[0]?.count ?? "0", 10)
    const hasVoted = Boolean(voteRows[0]?.exists)

    return NextResponse.json({ count, hasVoted })
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
    const hasExperienced = Boolean(body.hasExperienced)

    if (!bugId) {
      return NextResponse.json({ error: "bugId is required" }, { status: 400 })
    }

    if (hasExperienced) {
      await query(
        `INSERT INTO bug_votes (bug_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (bug_id, user_id) DO NOTHING`,
        [bugId, profile.id],
      )
    } else {
      await query(
        `DELETE FROM bug_votes
         WHERE bug_id = $1 AND user_id = $2`,
        [bugId, profile.id],
      )
    }

    const { rows: countRows } = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM bug_votes WHERE bug_id = $1",
      [bugId],
    )
    const count = Number.parseInt(countRows[0]?.count ?? "0", 10)

    return NextResponse.json({ count, hasVoted: hasExperienced })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

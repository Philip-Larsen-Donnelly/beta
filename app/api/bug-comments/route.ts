import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getCurrentProfile } from "@/lib/auth"

const DELETED_COMMENT_PLACEHOLDER = "_Comment deleted by user._"

async function requireUser() {
  const profile = await getCurrentProfile()
  if (!profile) {
    return { profile: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { profile, response: null }
}

function toCommentResponse(
  row: {
    id: string
    bug_id: string
    user_id: string
    content: string
    created_at: string
    updated_at: string | null
    deleted_at: string | null
    deleted_by: string | null
    profile_display_name: string | null
    profile_email: string | null
  },
) {
  const isDeleted = row.deleted_at !== null
  return {
    id: row.id,
    bug_id: row.bug_id,
    user_id: row.user_id,
    content: isDeleted ? DELETED_COMMENT_PLACEHOLDER : row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    profile:
      row.profile_display_name !== null || row.profile_email !== null
        ? { display_name: row.profile_display_name, email: row.profile_email }
        : null,
  }
}

async function getCommentById(commentId: string) {
  const { rows } = await query(
    `SELECT bc.*,
            p.display_name AS profile_display_name,
            p.email AS profile_email
     FROM bug_comments bc
     LEFT JOIN profiles p ON p.id = bc.user_id
     WHERE bc.id = $1
     LIMIT 1`,
    [commentId],
  )
  return rows[0]
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

    const comments = rows.map((row) => toCommentResponse(row))

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
       RETURNING id`,
      [bugId, profile.id, content],
    )

    const row = await getCommentById(rows[0].id as string)
    if (!row) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }
    const comment = toCommentResponse(row)

    return NextResponse.json(comment)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { profile, response } = await requireUser()
    if (!profile) return response

    const body = await req.json()
    const commentId = body.commentId as string | undefined
    const content = (body.content as string | undefined)?.trim()

    if (!commentId || !content) {
      return NextResponse.json({ error: "commentId and content are required" }, { status: 400 })
    }

    const existing = await getCommentById(commentId)
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }
    if (existing.user_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (existing.deleted_at) {
      return NextResponse.json({ error: "Deleted comments cannot be edited" }, { status: 400 })
    }

    await query(
      `UPDATE bug_comments
       SET content = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [commentId, content],
    )

    const updated = await getCommentById(commentId)
    if (!updated) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }
    return NextResponse.json(toCommentResponse(updated))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { profile, response } = await requireUser()
    if (!profile) return response

    const body = await req.json()
    const commentId = body.commentId as string | undefined
    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 })
    }

    const existing = await getCommentById(commentId)
    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }
    if (existing.user_id !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await query(
      `UPDATE bug_comments
       SET deleted_at = COALESCE(deleted_at, NOW()),
           deleted_by = COALESCE(deleted_by, $2),
           updated_at = NOW()
       WHERE id = $1`,
      [commentId, profile.id],
    )

    const updated = await getCommentById(commentId)
    if (!updated) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }
    return NextResponse.json(toCommentResponse(updated))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

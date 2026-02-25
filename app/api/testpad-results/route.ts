import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getCurrentProfile } from "@/lib/auth"

type ResultValue = "pass" | "fail" | "blocked" | null

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
    const resourceId = url.searchParams.get("resourceId")
    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required" }, { status: 400 })
    }

    const { rows } = await query<{ step_index: number; result: ResultValue }>(
      `SELECT step_index, result
       FROM testpad_results
       WHERE user_id = $1 AND resource_id = $2
       ORDER BY step_index ASC`,
      [profile.id, resourceId],
    )

    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { profile, response } = await requireUser()
    if (!profile) return response

    const body = await req.json()
    const resourceId = body.resourceId as string | undefined
    const stepIndex = Number(body.stepIndex)
    const result = (body.result ?? null) as ResultValue

    if (!resourceId || Number.isNaN(stepIndex)) {
      return NextResponse.json({ error: "resourceId and stepIndex are required" }, { status: 400 })
    }

    if (result !== null && !["pass", "fail", "blocked"].includes(result)) {
      return NextResponse.json({ error: "Invalid result" }, { status: 400 })
    }

    const { rows: resourceRows } = await query<{ component_id: string; campaign_id: string | null }>(
      `SELECT r.component_id, c.campaign_id
       FROM component_resources r
       LEFT JOIN components c ON c.id = r.component_id
       WHERE r.id = $1
       LIMIT 1`,
      [resourceId],
    )

    const resource = resourceRows[0]
    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 })
    }

    if (result === null) {
      await query(
        `DELETE FROM testpad_results
         WHERE user_id = $1 AND resource_id = $2 AND step_index = $3`,
        [profile.id, resourceId, stepIndex],
      )
      return NextResponse.json({ success: true })
    }

    const { rows } = await query(
      `INSERT INTO testpad_results (user_id, campaign_id, component_id, resource_id, step_index, result)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, resource_id, step_index)
       DO UPDATE SET
         result = EXCLUDED.result,
         campaign_id = EXCLUDED.campaign_id,
         component_id = EXCLUDED.component_id,
         updated_at = NOW()
       RETURNING *`,
      [
        profile.id,
        resource.campaign_id,
        resource.component_id,
        resourceId,
        stepIndex,
        result,
      ],
    )

    return NextResponse.json(rows[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

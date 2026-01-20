import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { component_id, name, type, content } = body
    const { rows } = await query(
      `INSERT INTO component_resources (component_id, name, type, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [component_id, name, type, content],
    )
    return NextResponse.json(rows[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const componentId = url.searchParams.get('componentId')
    if (!componentId) return NextResponse.json([], { status: 200 })
    const { rows } = await query(
      `SELECT * FROM component_resources WHERE component_id = $1 ORDER BY created_at ASC`,
      [componentId],
    )
    return NextResponse.json(rows)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

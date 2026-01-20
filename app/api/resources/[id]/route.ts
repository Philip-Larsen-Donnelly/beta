import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await req.json()
    const { name, type, content } = body
    const { rows } = await query(
      `UPDATE component_resources SET name = $1, type = $2, content = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [name, type, content, id],
    )
    return NextResponse.json(rows[0])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    await query('DELETE FROM component_resources WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"

const uploadsRoot = path.join(process.cwd(), "public", "uploads")

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments = [] } = await params
    const filePath = path.join(uploadsRoot, ...segments)
    const resolved = path.resolve(filePath)

    if (!resolved.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const data = await fs.readFile(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const contentType = contentTypes[ext] ?? "application/octet-stream"

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const uploadsDir = path.join(process.cwd(), "public", "uploads", "bugs")
const maxVideoBytes = 20 * 1024 * 1024 // 20MB
const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime", // .mov
])

function getExtension(fileName: string, fileType: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (ext) return ext
  if (fileType === "image/png") return ".png"
  if (fileType === "image/jpeg") return ".jpg"
  if (fileType === "image/gif") return ".gif"
  if (fileType === "image/webp") return ".webp"
  if (fileType === "video/mp4") return ".mp4"
  if (fileType === "video/quicktime") return ".mov"
  return ""
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: "Only image, mp4, and mov uploads are supported" }, { status: 400 })
    }
    if (file.type.startsWith("video/") && file.size > maxVideoBytes) {
      return NextResponse.json({ error: "Video uploads must be 20MB or smaller" }, { status: 400 })
    }

    const ext = getExtension(file.name, file.type)
    const filename = `${randomUUID()}${ext}`
    const targetPath = path.join(uploadsDir, filename)

    await fs.mkdir(uploadsDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(targetPath, buffer)
    await fs.chmod(targetPath, 0o664)

    return NextResponse.json({ url: `/uploads/bugs/${filename}` })
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : String(err)
    const normalized = rawMessage.toLowerCase()

    // Next.js can throw this before we can inspect file.size on oversized multipart payloads.
    if (normalized.includes("failed to parse body as formdata")) {
      return NextResponse.json({ error: "Video uploads must be 20MB or smaller" }, { status: 413 })
    }

    return NextResponse.json({ error: rawMessage }, { status: 500 })
  }
}

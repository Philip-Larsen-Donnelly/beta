import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const uploadsDir = path.join(process.cwd(), "public", "uploads", "bugs")

function getExtension(fileName: string, fileType: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (ext) return ext
  if (fileType === "image/png") return ".png"
  if (fileType === "image/jpeg") return ".jpg"
  if (fileType === "image/gif") return ".gif"
  if (fileType === "image/webp") return ".webp"
  return ""
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported" }, { status: 400 })
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
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

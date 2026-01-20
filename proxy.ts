import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { query } from "@/lib/db"

const protectedPaths = ["/guidelines", "/testing", "/admin"]
const authPaths = ["/auth/login", "/auth/sign-up"]

export async function proxy(request: NextRequest) {
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  const token = request.cookies.get("session_token")?.value
  let hasSession = false

  if (token) {
    const { rows } = await query("SELECT 1 FROM sessions WHERE token = $1 AND expires_at > NOW() LIMIT 1", [token])
    hasSession = rows.length > 0
  }

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  if (isAuthPath && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = "/guidelines"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}

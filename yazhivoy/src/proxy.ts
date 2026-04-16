import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const PUBLIC_PATHS = ["/login", "/invite"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Публичные маршруты — пропускаем
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/invites") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next()
  }

  const sid = req.cookies.get("sid")?.value
  if (!sid) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)",
  ],
}

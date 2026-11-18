import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken } from "@/lib/session";

const COOKIE = "lacoster_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const secret = process.env.AUTH_SECRET ?? "";
  const token = req.cookies.get(COOKIE)?.value;
  const authed = await isValidSessionToken(token, secret);

  const isLogin = pathname === "/login";
  const isAuthApi =
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout");

  if (pathname.startsWith("/api/") && !isAuthApi && !authed) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!authed && !isLogin && !isAuthApi) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authed && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

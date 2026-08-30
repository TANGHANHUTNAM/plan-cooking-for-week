import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_RENEW_AFTER_S,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

// Chặn toàn bộ app sau đăng nhập; /login là route công khai duy nhất.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Sliding renewal: còn dùng app thì phiên không bao giờ hết hạn
  const ageS = Math.floor(Date.now() / 1000) - session.iat;
  if (ageS > SESSION_RENEW_AFTER_S) {
    const fresh = await createSessionToken({
      id: session.sub,
      email: session.email,
      name: session.name,
    });
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, fresh, sessionCookieOptions());
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Bỏ qua asset tĩnh; mọi trang đều qua kiểm tra phiên
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/).*)",
  ],
};

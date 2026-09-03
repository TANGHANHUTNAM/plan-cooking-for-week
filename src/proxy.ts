import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_RENEW_AFTER_S,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

// Protect the entire app after sign-in; /login is the only public route.
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

  // Sliding renewal: the session never expires while the app is in use
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
    // Skip static assets; every page still goes through session checks
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/).*)",
  ],
};

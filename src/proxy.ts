/**
 * Host-based routing for the admin console.
 *
 *  admin.<domain>  → serves the admin app (src/app/admin-site) at clean URLs (/, /login, /cases…)
 *                    and only the /api/admin/* API.
 *  any other host  → never serves the admin pages or /api/admin/*.
 *
 * One deployment, two origins: Firebase Auth state is per-origin, so the admin
 * login is completely separate from the public site's session.
 */
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin-site";
const isAdminHost = (host: string) => host.startsWith("admin.");

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  const { pathname } = req.nextUrl;
  const notFound = () => NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 });

  if (!isAdminHost(host)) {
    if (pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith("/api/admin")) return notFound();
    return NextResponse.next();
  }

  // Admin host: only the admin API and admin pages exist.
  let res: NextResponse;
  if (pathname.startsWith("/api/")) {
    res = pathname.startsWith("/api/admin") ? NextResponse.next() : notFound();
  } else if (pathname.startsWith(ADMIN_PREFIX)) {
    res = notFound(); // no direct access to the internal prefix
  } else {
    const url = req.nextUrl.clone();
    url.pathname = `${ADMIN_PREFIX}${pathname === "/" ? "" : pathname}`;
    res = NextResponse.rewrite(url);
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export const config = {
  // Skip static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|demo/).*)"],
};

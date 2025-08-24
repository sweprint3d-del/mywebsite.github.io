import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function expectedCookieValue(secret: string) {
  // stable, signed value; not reversible; same value checked in login API
  return crypto.createHmac("sha256", secret).update("admin-ok").digest("base64url");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect the admin page (and anything under /admin if you add subroutes later)
  if (pathname.startsWith("/admin")) {
    const secret = process.env.ADMIN_SECRET || "";
    if (!secret) return NextResponse.json({ error: "ADMIN_SECRET saknas" }, { status: 500 });

    const cookie = req.cookies.get("admin_session")?.value;
    const valid = cookie && cookie === expectedCookieValue(secret);

    if (!valid) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin-login";
      url.searchParams.set("next", pathname); // so we can return after login
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin"],
};

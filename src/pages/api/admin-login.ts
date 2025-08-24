import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

function expectedCookieValue(secret: string) {
  return crypto.createHmac("sha256", secret).update("admin-ok").digest("base64url");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Endast POST" });

  const password = String(req.body?.password || "");
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
  const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

  if (!ADMIN_PASSWORD || !ADMIN_SECRET) {
    return res.status(500).json({ error: "ADMIN_PASSWORD/ADMIN_SECRET saknas i miljön" });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Fel lösenord" });
  }

  const cookieVal = expectedCookieValue(ADMIN_SECRET);

  // Set secure cookie
  res.setHeader("Set-Cookie", [
    `admin_session=${cookieVal}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  ]);

  const next = typeof req.query.next === "string" ? req.query.next : "/admin";
  return res.status(200).json({ ok: true, redirect: next });
}

/* Local development sign-in: users in .data/db.json, scrypt password hashes, an HMAC-signed session cookie. */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { readDB, writeDB } from "./repo/local";
import { env } from "./env";

const COOKIE = "rs_session";
const secret = () => env.sessionSecret || "local-dev-secret-change-me";
const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("base64url");
const hash = (pw: string, salt: string) => crypto.scryptSync(pw, salt, 32).toString("hex");

export async function localCurrentUserId(): Promise<string | null> {
  const c = (await cookies()).get(COOKIE)?.value; if (!c) return null;
  const [payload, sig] = c.split("."); if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { const o = JSON.parse(Buffer.from(payload, "base64url").toString()); if (o.exp < Date.now()) return null; return o.uid; } catch { return null; }
}
async function setSession(uid: string) {
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + 30 * 864e5 })).toString("base64url");
  (await cookies()).set(COOKIE, payload + "." + sign(payload), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
}
export async function localSignOut() { (await cookies()).delete(COOKIE); }
export async function localSignUp(email: string, password: string, meta: Record<string, string>) {
  const d = readDB(); const e = email.trim().toLowerCase();
  if (d.users.some(u => u.email === e)) throw new Error("An account with this email already exists. Sign in instead.");
  const salt = crypto.randomBytes(16).toString("hex"); const id = crypto.randomUUID(); const now = new Date().toISOString();
  d.users.push({ id, email: e, salt, hash: hash(password, salt), meta, createdAt: now });
  d.profiles.push({ id, email: e, name: meta.name || "", organisation: meta.organisation || "", jobRole: meta.job_role || "", role: "member", planId: "starter", status: "active", createdAt: now, lastActiveAt: now });
  writeDB(d); await setSession(id); return id;
}
export async function localSignIn(email: string, password: string) {
  const d = readDB(); const u = d.users.find(x => x.email === email.trim().toLowerCase());
  if (!u || hash(password, u.salt) !== u.hash) throw new Error("That email and password don't match. Check them and try again.");
  await setSession(u.id); return u.id;
}
export async function localUpdatePassword(uid: string, password: string) {
  const d = readDB(); const u = d.users.find(x => x.id === uid); if (!u) throw new Error("Account not found.");
  u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hash(password, u.salt); writeDB(d);
}
/** Local mode has no email: the reset link is printed in the server log instead. */
export function localCreateResetToken(email: string): string | null {
  const d = readDB(); const u = d.users.find(x => x.email === email.trim().toLowerCase()); if (!u) return null;
  const token = crypto.randomBytes(24).toString("base64url"); d.resetTokens = (d.resetTokens || []).filter(t => t.exp > Date.now());
  d.resetTokens.push({ token, userId: u.id, exp: Date.now() + 3600e3 }); writeDB(d); return token;
}
export async function localConsumeResetToken(token: string) {
  const d = readDB(); const t = (d.resetTokens || []).find(x => x.token === token && x.exp > Date.now()); if (!t) return null;
  d.resetTokens = d.resetTokens.filter(x => x.token !== token); writeDB(d); await setSession(t.userId); return t.userId;
}

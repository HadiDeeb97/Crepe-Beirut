/*
 * Helpers for the Cloudflare Pages Functions in /functions.
 * Needs two things set on the Pages project:
 *   - a D1 database bound as `DB`
 *   - an environment variable (secret) `ADMIN_PASSWORD`
 */
import { DEFAULT_CONTENT } from "../public/js/defaults.js";
import { normalizeContent } from "../public/js/shared.js";

export { DEFAULT_CONTENT };

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function fail(status, error, extra = {}) {
  return json({ error, ...extra }, { status });
}

export async function readJson(request, maxBytes = 300000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Request is too large.");
  try { return JSON.parse(text); } catch { throw new Error("Request is not valid JSON."); }
}

/* ---------- Database ---------- */

let schemaReady = false;

export async function db(env) {
  if (!env.DB) return null;
  if (!schemaReady) {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)"),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        staff_note TEXT NOT NULL DEFAULT '',
        lines TEXT NOT NULL,
        item_count INTEGER NOT NULL,
        subtotal INTEGER NOT NULL,
        fee INTEGER NOT NULL,
        total INTEGER NOT NULL
      )`),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS orders_created ON orders (created_at)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS orders_status ON orders (status)")
    ]);
    schemaReady = true;
  }
  return env.DB;
}

/** The live site content and when it was last published ({ content, updatedAt }). */
export async function loadContent(env) {
  const d = await db(env);
  if (!d) return { content: DEFAULT_CONTENT, updatedAt: null, source: "defaults" };
  const row = await d.prepare("SELECT value, updated_at FROM content WHERE key = 'site'").first();
  if (!row) return { content: DEFAULT_CONTENT, updatedAt: null, source: "defaults" };
  try {
    return { content: normalizeContent(JSON.parse(row.value), DEFAULT_CONTENT), updatedAt: row.updated_at, source: "database" };
  } catch {
    return { content: DEFAULT_CONTENT, updatedAt: row.updated_at, source: "defaults" };
  }
}

/* ---------- Admin sessions ---------- */

const COOKIE = "cb_admin";
const SESSION_DAYS = 14;
const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode("crepe-beirut:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function passwordMatches(env, attempt) {
  if (!env.ADMIN_PASSWORD) return false;
  // Compare HMACs so the comparison takes the same time whatever the input.
  const [a, b] = await Promise.all([hmac("pw", String(attempt || "")), hmac("pw", env.ADMIN_PASSWORD)]);
  return safeEqual(a, b);
}

export async function sessionCookie(env, request) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const value = exp + "." + (await hmac(env.ADMIN_PASSWORD, "session:" + exp));
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = request.headers.get("cookie") || "";
  const m = new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)").exec(cookie);
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.ADMIN_PASSWORD, "session:" + exp));
}

/** Reject cross-site writes: the Origin header must match this site. */
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export function rowToOrder(r) {
  let lines = [];
  try { lines = JSON.parse(r.lines); } catch { /* keep empty */ }
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, status: r.status, type: r.type,
    name: r.name, phone: r.phone, address: r.address, notes: r.notes, staffNote: r.staff_note,
    lines, itemCount: r.item_count, subtotal: r.subtotal, fee: r.fee, total: r.total
  };
}

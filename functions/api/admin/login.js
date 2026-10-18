// POST /api/admin/login { password }
import { adminPassword, fail, json, passwordMatches, readJson, sessionCookie, tooMany } from "../../../lib/server.js";

export async function onRequestPost({ request, env }) {
  if (!adminPassword(env)) return fail(503, "No admin password is set. Add ADMIN_PASSWORD in the Cloudflare project settings.");
  // 10 tries per 10 minutes per device, so the password can't be guessed by brute force.
  if (tooMany("login", request, 10, 10 * 60000)) return fail(429, "Too many tries. Wait a few minutes, then sign in again.");
  let body;
  try { body = await readJson(request, 2000); } catch (e) { return fail(400, e.message); }
  if (!(await passwordMatches(env, body.password))) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return fail(401, "That password is not right.");
  }
  return json({ ok: true }, { headers: { "set-cookie": await sessionCookie(env, request) } });
}

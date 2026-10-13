// POST /api/admin/login { password }
import { fail, json, passwordMatches, readJson, sessionCookie } from "../../../lib/server.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return fail(503, "No admin password is set. Add ADMIN_PASSWORD in the Cloudflare project settings.");
  let body;
  try { body = await readJson(request, 2000); } catch (e) { return fail(400, e.message); }
  if (!(await passwordMatches(env, body.password))) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return fail(401, "That password is not right.");
  }
  return json({ ok: true }, { headers: { "set-cookie": await sessionCookie(env, request) } });
}

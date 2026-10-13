// POST /api/admin/logout
import { clearCookie, json } from "../../../lib/server.js";

export async function onRequestPost() {
  return json({ ok: true }, { headers: { "set-cookie": clearCookie() } });
}

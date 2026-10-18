// POST /api/drafts: save an unfinished order while the customer fills in the checkout form.
// Sent a moment after they stop typing, once the bag has items and they gave a name and a phone
// number. Pressing "Send order on WhatsApp" turns it into a real order (see orders.js), which
// removes it. Unfinished orders older than 14 days are deleted.
import { bumpDraftsVersion, db, fail, loadContent, readJson, sameOrigin, tooMany } from "../../lib/server.js";
import { indexContent, priceLine, MAX_LINES } from "../../public/js/shared.js";

const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const KEEP_DAYS = 14;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail(403, "This request came from another site.");
  if (tooMany("draft", request, 40, 60000)) return new Response(null, { status: 204 });
  const d = await db(env);
  if (!d) return new Response(null, { status: 204 });

  let body;
  try { body = await readJson(request, 40000); } catch (e) { return fail(400, e.message); }
  const token = String(body.token || "");
  if (!/^[a-z0-9]{16,40}$/.test(token)) return fail(400, "Missing draft id.");

  const name = clip(body.name, 80);
  const phone = clip(body.phone, 30);
  const lines = Array.isArray(body.lines) ? body.lines.slice(0, MAX_LINES) : [];
  // Without a name, a phone number or items there is nothing to follow up on: forget it.
  if (!name || phone.replace(/\D/g, "").length < 7 || !lines.length) {
    await forget(d, token);
    return new Response(null, { status: 204 });
  }

  const { content } = await loadContent(env, { cached: true });
  const index = indexContent(content);
  const priced = lines.map((l) => priceLine(index, l)).filter((p) => p.ok).map(({ ok, ...rest }) => rest);
  if (!priced.length) return new Response(null, { status: 204 });

  const type = body.type === "Pickup" ? "Pickup" : "Delivery";
  const now = new Date();
  const old = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString();
  // One statement checks and writes, so a save racing the customer's "Send order" can't bring the
  // unfinished order back: if the same phone just ordered (last 10 minutes), nothing is written.
  const recent = new Date(now.getTime() - 10 * 60000).toISOString();
  await d.batch([
    d.prepare(
      `INSERT INTO drafts (token, created_at, updated_at, type, name, phone, address, notes, lines, item_count, subtotal)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM orders WHERE created_at > ? AND phone = ?)
       ON CONFLICT(token) DO UPDATE SET updated_at = excluded.updated_at, type = excluded.type, name = excluded.name,
         phone = excluded.phone, address = excluded.address, notes = excluded.notes, lines = excluded.lines,
         item_count = excluded.item_count, subtotal = excluded.subtotal`
    ).bind(token, now.toISOString(), now.toISOString(), type, name, phone, type === "Delivery" ? clip(body.address, 300) : "", clip(body.notes, 500),
      JSON.stringify(priced), priced.reduce((t, l) => t + l.qty, 0), priced.reduce((t, l) => t + l.total, 0), recent, phone),
    d.prepare("DELETE FROM drafts WHERE updated_at < ?").bind(old),
    bumpDraftsVersion(d)
  ]);
  return new Response(null, { status: 204 });
}

// Remove an unfinished order, and tell the admin's list only if there was one.
async function forget(d, token) {
  const r = await d.prepare("DELETE FROM drafts WHERE token = ?").bind(token).run();
  if (r.meta && r.meta.changes) await bumpDraftsVersion(d).run();
}

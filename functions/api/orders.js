// POST /api/orders: save an order from the website before the customer sends it on WhatsApp.
// Prices are recalculated here from the live menu; prices sent by the browser are ignored.
import { bumpDraftsVersion, bumpOrdersVersion, db, fail, json, loadContent, readJson, sameOrigin } from "../../lib/server.js";
import { indexContent, priceLine, orderNumber, MAX_LINES } from "../../public/js/shared.js";

const clip = (v, n) => String(v == null ? "" : v).trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return fail(403, "This request came from another site.");
  const d = await db(env);
  if (!d) return fail(503, "Order saving is not set up yet.");

  let body;
  try { body = await readJson(request, 40000); } catch (e) { return fail(400, e.message); }

  const { content } = await loadContent(env);
  const s = content.settings;
  if (!s.orderingOpen) return fail(409, s.pausedMessage, { code: "paused" });

  const type = body.type === "Pickup" ? "Pickup" : "Delivery";
  const name = clip(body.name, 80);
  const phone = clip(body.phone, 30);
  const address = type === "Delivery" ? clip(body.address, 300) : "";
  const notes = clip(body.notes, 500);
  if (!name) return fail(400, "Please add your name.");
  if (phone.replace(/\D/g, "").length < 7) return fail(400, "Please add a phone number we can call.");
  if (type === "Delivery" && !address) return fail(400, "Please add a delivery address.");
  if (!Array.isArray(body.lines) || !body.lines.length) return fail(400, "Your order is empty.");
  if (body.lines.length > MAX_LINES) return fail(400, "That order has too many lines. Please message us on WhatsApp.");

  const index = indexContent(content);
  const priced = body.lines.map((l) => priceLine(index, l));
  const bad = priced.filter((p) => !p.ok);
  if (bad.length) {
    return fail(409, bad.map((b) => b.name).join(", ") + (bad.length > 1 ? " are" : " is") + " no longer available.", {
      code: "unavailable", items: bad.map((b) => b.name)
    });
  }
  const lines = priced.map(({ ok, ...rest }) => rest);
  const subtotal = lines.reduce((t, l) => t + l.total, 0);
  const fee = type === "Delivery" ? s.deliveryFee || 0 : 0;
  const total = subtotal + fee;
  const itemCount = lines.reduce((t, l) => t + l.qty, 0);
  const now = new Date().toISOString();

  const [inserted] = await d.batch([
    d.prepare(
      `INSERT INTO orders (created_at, updated_at, status, type, name, phone, address, notes, lines, item_count, subtotal, fee, total)
       VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(now, now, type, name, phone, address, notes, JSON.stringify(lines), itemCount, subtotal, fee, total),
    bumpOrdersVersion(d),
    // The customer finished: their unfinished order (if one was saved) is now a real order.
    ...(/^[a-z0-9]{16,40}$/.test(body.draft || "") ? [d.prepare("DELETE FROM drafts WHERE token = ?").bind(body.draft), bumpDraftsVersion(d)] : [])
  ]);
  const row = inserted.results[0];

  return json({ id: row.id, number: orderNumber(row.id), lines, subtotal, fee, total }, { status: 201 });
}

// PATCH  /api/admin/orders/:id { status?, staffNote? }
// DELETE /api/admin/orders/:id
import { bumpOrdersVersion, db, fail, json, readJson, rowToOrder } from "../../../../lib/server.js";
import { ORDER_STATUSES } from "../../../../public/js/shared.js";

export async function onRequestPatch({ request, env, params }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return fail(400, "Unknown order.");
  let body;
  try { body = await readJson(request, 4000); } catch (e) { return fail(400, e.message); }

  const sets = [], args = [];
  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) return fail(400, "Unknown status.");
    sets.push("status = ?"); args.push(body.status);
  }
  if (body.staffNote !== undefined) { sets.push("staff_note = ?"); args.push(String(body.staffNote).slice(0, 500)); }
  if (!sets.length) return fail(400, "Nothing to change.");
  sets.push("updated_at = ?"); args.push(new Date().toISOString());

  const [updated] = await d.batch([
    d.prepare("UPDATE orders SET " + sets.join(", ") + " WHERE id = ? RETURNING *").bind(...args, id),
    bumpOrdersVersion(d)
  ]);
  const row = updated.results[0];
  if (!row) return fail(404, "That order does not exist.");
  return json({ order: rowToOrder(row) });
}

// DELETE /api/admin/orders/:id: remove one order for good.
export async function onRequestDelete({ env, params }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return fail(400, "Unknown order.");
  const [res] = await d.batch([d.prepare("DELETE FROM orders WHERE id = ? RETURNING id").bind(id), bumpOrdersVersion(d)]);
  if (!res.results.length) return fail(404, "That order was already deleted.");
  return json({ deleted: 1 });
}

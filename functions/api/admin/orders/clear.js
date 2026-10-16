// POST /api/admin/orders/clear { scope, dryRun?, confirm? }: delete many orders at once.
//   scope "finished" = completed and cancelled, "older" = placed more than 30 days ago, "all" = every order.
//   dryRun: only count. "all" also needs confirm: "DELETE".
// Order numbers are never reused, so new orders keep counting up after a clear.
import { bumpOrdersVersion, db, fail, json, loadContent, readJson } from "../../../../lib/server.js";
import { startOfShopDay } from "../../../../public/js/shared.js";

export async function scopeWhere(scope, env) {
  if (scope === "finished") return { sql: "status IN ('completed', 'cancelled')", args: [] };
  if (scope === "older") {
    const { content } = await loadContent(env);
    return { sql: "created_at < ?", args: [startOfShopDay(content.settings.timezone || "Asia/Beirut", 30).toISOString()] };
  }
  if (scope === "all") return { sql: "1 = 1", args: [] };
  return null;
}

export async function onRequestPost({ request, env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  let body;
  try { body = await readJson(request, 2000); } catch (e) { return fail(400, e.message); }
  const where = await scopeWhere(body.scope, env);
  if (!where) return fail(400, "Choose which orders to clear.");

  const count = (await d.prepare("SELECT COUNT(*) AS n FROM orders WHERE " + where.sql).bind(...where.args).first()).n;
  if (body.dryRun) return json({ count });
  if (body.scope === "all" && body.confirm !== "DELETE") return fail(400, "Type DELETE to confirm clearing every order.");
  if (!count) return json({ deleted: 0 });
  await d.batch([d.prepare("DELETE FROM orders WHERE " + where.sql).bind(...where.args), bumpOrdersVersion(d)]);
  return json({ deleted: count });
}

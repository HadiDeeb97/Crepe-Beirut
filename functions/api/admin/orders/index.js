// GET /api/admin/orders?status=new&since=ISO&q=text&limit=200
// Returns matching orders plus summary numbers for the dashboard.
import { db, fail, json, loadContent, rowToOrder } from "../../../../lib/server.js";
import { ORDER_STATUSES, startOfShopDay } from "../../../../public/js/shared.js";

export async function onRequestGet({ request, env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected, so there are no orders to show.");
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const since = url.searchParams.get("since");
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));

  const where = [], args = [];
  if (since && !Number.isNaN(Date.parse(since))) { where.push("created_at >= ?"); args.push(new Date(since).toISOString()); }
  if (q) {
    const idq = Number(q.replace(/^cb-?/i, "")) - 1000;
    where.push("(name LIKE ? OR phone LIKE ? OR address LIKE ?" + (idq > 0 ? " OR id = ?" : "") + ")");
    args.push("%" + q + "%", "%" + q + "%", "%" + q + "%");
    if (idq > 0) args.push(idq);
  }
  const base = where.length ? " WHERE " + where.join(" AND ") : "";
  const listWhere = status && ORDER_STATUSES.includes(status) ? (base ? base + " AND status = ?" : " WHERE status = ?") : base;
  const listArgs = status && ORDER_STATUSES.includes(status) ? [...args, status] : args;

  const [list, counts] = await d.batch([
    d.prepare("SELECT * FROM orders" + listWhere + " ORDER BY id DESC LIMIT ?").bind(...listArgs, limit),
    d.prepare("SELECT status, COUNT(*) AS n, COALESCE(SUM(total), 0) AS sales FROM orders" + base + " GROUP BY status").bind(...args)
  ]);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, { count: 0, sales: 0 }]));
  for (const r of counts.results) if (byStatus[r.status]) byStatus[r.status] = { count: r.n, sales: r.sales };
  // Dashboard numbers: today and the last 7 days in the shop's time zone, cancelled orders excluded.
  const { content } = await loadContent(env);
  const tz = content.settings.timezone || "Asia/Beirut";
  const today = startOfShopDay(tz, 0).toISOString();
  const week = startOfShopDay(tz, 6).toISOString();
  const sum = "SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS sales FROM orders WHERE status != 'cancelled' AND created_at >= ?";
  const [t, w, waiting, newest] = await d.batch([
    d.prepare(sum).bind(today),
    d.prepare(sum).bind(week),
    d.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"),
    d.prepare("SELECT MAX(id) AS id FROM orders")
  ]);
  const summary = {
    today: { count: t.results[0].n, sales: t.results[0].sales, since: today },
    week: { count: w.results[0].n, sales: w.results[0].sales, since: week },
    waiting: waiting.results[0].n
  };
  return json({ orders: list.results.map(rowToOrder), byStatus, summary, newestId: newest.results[0].id || 0 });
}

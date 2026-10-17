// GET /api/admin/orders/version: numbers that change whenever an order (or an unfinished order) changes.
// The Orders screen polls this (one row read) and reloads the full list only when it changes.
import { db, fail, json } from "../../../../lib/server.js";

export async function onRequestGet({ env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  const { results } = await d.prepare("SELECT key, value FROM meta WHERE key IN ('orders_version', 'drafts_version')").all();
  const v = Object.fromEntries(results.map((r) => [r.key, r.value]));
  return json({ version: v.orders_version || 0, drafts: v.drafts_version || 0 });
}

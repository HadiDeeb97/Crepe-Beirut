// GET /api/admin/orders/version: a number that changes whenever an order is added or updated.
// The Orders screen polls this (one row read) and reloads the full list only when it changes.
import { db, fail, json } from "../../../../lib/server.js";

export async function onRequestGet({ env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  const row = await d.prepare("SELECT value FROM meta WHERE key = 'orders_version'").first();
  return json({ version: row ? row.value : 0 });
}

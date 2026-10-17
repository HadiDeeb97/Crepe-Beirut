// GET    /api/admin/drafts: unfinished orders, newest first (customers who gave their name and
//        phone but didn't press "Send order on WhatsApp").
// DELETE /api/admin/drafts?token=…: remove one.  DELETE /api/admin/drafts?all=1: remove them all.
import { bumpDraftsVersion, db, fail, json, rowToDraft } from "../../../lib/server.js";

export async function onRequestGet({ env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  const { results } = await d.prepare("SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 100").all();
  return json({ drafts: results.map(rowToDraft) });
}

export async function onRequestDelete({ request, env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (url.searchParams.get("all") === "1") {
    await d.batch([d.prepare("DELETE FROM drafts"), bumpDraftsVersion(d)]);
    return json({ deleted: "all" });
  }
  if (!/^[a-z0-9]{16,40}$/.test(token)) return fail(400, "Which unfinished order?");
  await d.batch([d.prepare("DELETE FROM drafts WHERE token = ?").bind(token), bumpDraftsVersion(d)]);
  return json({ deleted: 1 });
}

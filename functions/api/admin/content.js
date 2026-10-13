// GET  /api/admin/content: the saved content (or the defaults) plus when it was published.
// PUT  /api/admin/content { content, baseUpdatedAt }: publish new content.
import { DEFAULT_CONTENT, db, fail, json, loadContent, readJson } from "../../../lib/server.js";
import { normalizeContent } from "../../../public/js/shared.js";

export async function onRequestGet({ env }) {
  const { content, updatedAt, source } = await loadContent(env);
  return json({ content, updatedAt, source });
}

export async function onRequestPut({ request, env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected, so changes cannot be saved.");
  let body;
  try { body = await readJson(request, 400000); } catch (e) { return fail(400, e.message); }

  const current = await d.prepare("SELECT updated_at FROM content WHERE key = 'site'").first();
  if (current && body.baseUpdatedAt !== current.updated_at) {
    return fail(409, "Someone else published changes after you opened this page. Reload to get their version, then make your edits again.", { code: "conflict" });
  }
  let content;
  try { content = normalizeContent(body.content, DEFAULT_CONTENT); } catch (e) { return fail(400, e.message); }

  const now = new Date().toISOString();
  await d.prepare(
    "INSERT INTO content (key, value, updated_at) VALUES ('site', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).bind(JSON.stringify(content), now).run();
  return json({ content, updatedAt: now });
}

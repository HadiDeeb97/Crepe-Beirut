// GET  /api/admin/content: the saved content (or the defaults) plus when it was published.
// PUT  /api/admin/content { content, baseUpdatedAt }: publish new content, then delete stored
//      pictures the website no longer uses (replaced or removed photos).
import { DEFAULT_CONTENT, db, fail, json, loadContent, readJson } from "../../../lib/server.js";
import { imageIdsIn, normalizeContent } from "../../../public/js/shared.js";

// Pictures uploaded this recently are kept even if unused, so an upload still being worked on
// (for example in another tab) is not removed by someone else's publish.
const KEEP_NEW_UPLOADS_MS = 30 * 60 * 1000;

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

  // Every picture the new content uses must still exist.
  const used = imageIdsIn(content);
  const stored = (await d.prepare("SELECT id, created_at FROM images").all()).results;
  const storedIds = new Set(stored.map((r) => r.id));
  const missing = [...used].filter((id) => !storedIds.has(id));
  if (missing.length) {
    return fail(409, missing.length === 1
      ? "One of the pictures in your changes is no longer stored. Upload it again, then publish."
      : missing.length + " pictures in your changes are no longer stored. Upload them again, then publish.", { code: "missing-images" });
  }

  const now = new Date().toISOString();
  await d.prepare(
    "INSERT INTO content (key, value, updated_at) VALUES ('site', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
  ).bind(JSON.stringify(content), now).run();

  // Delete pictures nothing uses any more.
  const cutoff = Date.now() - KEEP_NEW_UPLOADS_MS;
  const unused = stored.filter((r) => !used.has(r.id) && Date.parse(r.created_at) < cutoff).map((r) => r.id);
  for (let i = 0; i < unused.length; i += 50) {
    const chunk = unused.slice(i, i + 50);
    await d.prepare("DELETE FROM images WHERE id IN (" + chunk.map(() => "?").join(",") + ")").bind(...chunk).run();
  }
  return json({ content, updatedAt: now, removedImages: unused.length });
}

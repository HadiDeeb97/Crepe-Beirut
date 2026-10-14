// GET /api/images/:id: an image uploaded in the admin. Ids are content hashes, so they never change.
import { db } from "../../../lib/server.js";
import { isImageId } from "../../../public/js/shared.js";

export async function onRequestGet({ env, params, request }) {
  // "<id>s" is the small copy made for thumbnails; older uploads without one get the full picture.
  const id = String(params.id || "");
  const small = id.length === 65 && id.endsWith("s");
  const base = small ? id.slice(0, 64) : id;
  if (!isImageId(base)) return new Response("Not found", { status: 404 });
  const etag = '"' + id + '"';
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
  const d = await db(env);
  if (!d) return new Response("Not found", { status: 404 });
  let row = await d.prepare("SELECT type, data FROM images WHERE id = ?").bind(id).first();
  if (!row && small) row = await d.prepare("SELECT type, data FROM images WHERE id = ?").bind(base).first();
  if (!row) return new Response("Not found", { status: 404 });
  const bytes = row.data instanceof ArrayBuffer ? new Uint8Array(row.data) : new Uint8Array(row.data);
  return new Response(bytes, {
    headers: {
      "content-type": row.type,
      "cache-control": "public, max-age=31536000, immutable",
      etag,
      "x-content-type-options": "nosniff"
    }
  });
}

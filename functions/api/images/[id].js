// GET /api/images/:id: an image uploaded in the admin. Ids are content hashes, so they never change.
import { db } from "../../../lib/server.js";
import { isImageId } from "../../../public/js/shared.js";

export async function onRequestGet({ env, params, request }) {
  const id = String(params.id || "");
  if (!isImageId(id)) return new Response("Not found", { status: 404 });
  const etag = '"' + id + '"';
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
  const d = await db(env);
  if (!d) return new Response("Not found", { status: 404 });
  const row = await d.prepare("SELECT type, data FROM images WHERE id = ?").bind(id).first();
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

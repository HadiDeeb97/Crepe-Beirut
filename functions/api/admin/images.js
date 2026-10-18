// POST /api/admin/images (body: the image file). Saves it and returns { id, url }.
// POST /api/admin/images?of=<id> saves the small thumbnail copy of picture <id>.
// GET  /api/admin/images lists the full pictures with their format and size (to convert old ones to WebP).
// The admin panel shrinks photos before uploading, so files are small.
import { db, fail, json } from "../../../lib/server.js";
import { imageUrl, isImageId } from "../../../public/js/shared.js";

const MAX_BYTES = 1.5 * 1024 * 1024;

function sniff(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return "";
}

export async function onRequestPost({ request, env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected, so images cannot be saved.");
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return fail(400, "The file is empty.");
  if (buf.byteLength > MAX_BYTES) return fail(413, "That picture is too large. Use one under 1.5 MB.");
  const bytes = new Uint8Array(buf);
  const type = sniff(bytes);
  if (!type) return fail(415, "Use a JPG, PNG or WebP picture.");
  const of = new URL(request.url).searchParams.get("of");
  let id;
  if (of) {
    if (!isImageId(of)) return fail(400, "Unknown picture.");
    const parent = await d.prepare("SELECT id FROM images WHERE id = ?").bind(of).first();
    if (!parent) return fail(404, "Upload the full picture first.");
    id = of + "s";
    await d.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
  } else {
    const hash = await crypto.subtle.digest("SHA-256", buf);
    id = Array.from(new Uint8Array(hash), (x) => x.toString(16).padStart(2, "0")).join("");
  }
  await d.prepare("INSERT OR IGNORE INTO images (id, type, data, size, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, type, bytes, bytes.byteLength, new Date().toISOString()).run();
  return json({ id, url: "/api/images/" + id, size: bytes.byteLength }, { status: 201 });
}

export async function onRequestGet({ env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  // Full pictures only: the small copies have the same id with "s" on the end.
  const { results } = await d.prepare("SELECT id, type, size FROM images WHERE id NOT LIKE '%s'").all();
  return json({ images: results });
}

// Cloudflare Pages: /site.webmanifest with the admin's website icon.
import { loadContent } from "../lib/server.js";
import { manifestJson } from "../lib/seo.js";

export async function onRequestGet({ env }) {
  let data = null;
  try { data = await loadContent(env, { cached: true }); } catch { /* the built-in icons */ }
  return new Response(manifestJson(data && data.content), { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } });
}

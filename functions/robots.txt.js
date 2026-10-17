// Cloudflare Pages: /robots.txt, pointing search engines to the sitemap.
import { loadContent } from "../lib/server.js";
import { robotsTxt, siteOrigin } from "../lib/seo.js";

export async function onRequestGet({ request, env }) {
  let data = null;
  try { data = await loadContent(env, { cached: true }); } catch { /* use the visitor's address */ }
  return new Response(robotsTxt(siteOrigin(request, data && data.content.texts)), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

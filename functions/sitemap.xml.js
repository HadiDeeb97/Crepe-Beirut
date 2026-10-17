// Cloudflare Pages: /sitemap.xml for search engines.
import { loadContent } from "../lib/server.js";
import { siteOrigin, sitemapXml } from "../lib/seo.js";

export async function onRequestGet({ request, env }) {
  let data = null;
  try { data = await loadContent(env, { cached: true }); } catch { /* use the visitor's address */ }
  return new Response(sitemapXml(siteOrigin(request, data && data.content.texts), data && data.updatedAt), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}

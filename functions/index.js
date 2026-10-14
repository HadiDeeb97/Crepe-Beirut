// Cloudflare Pages: serve the home page with the live theme and content filled in.
import { renderHome } from "../lib/page.js";

export async function onRequestGet({ request, env }) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;
  return renderHome(request, env, asset);
}

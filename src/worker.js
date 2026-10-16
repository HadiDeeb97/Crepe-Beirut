/*
 * Cloudflare Worker entry point.
 * Static files in /public are served by Workers Static Assets; only /api/* reaches this code
 * (see "run_worker_first" in wrangler.jsonc). The route handlers live in /functions and use the
 * Pages Functions signature, so the same files also work on Cloudflare Pages.
 */
import * as content from "../functions/api/content.js";
import * as orders from "../functions/api/orders.js";
import * as adminGuard from "../functions/api/admin/_middleware.js";
import * as me from "../functions/api/admin/me.js";
import * as login from "../functions/api/admin/login.js";
import * as logout from "../functions/api/admin/logout.js";
import * as adminContent from "../functions/api/admin/content.js";
import * as adminOrders from "../functions/api/admin/orders/index.js";
import * as adminOrder from "../functions/api/admin/orders/[id].js";
import * as adminOrdersVersion from "../functions/api/admin/orders/version.js";
import * as adminOrdersClear from "../functions/api/admin/orders/clear.js";
import * as adminOrdersExport from "../functions/api/admin/orders/export.js";
import * as image from "../functions/api/images/[id].js";
import * as adminImages from "../functions/api/admin/images.js";
import { fail, isDailyLimitError } from "../lib/server.js";
import { renderHome } from "../lib/page.js";

const ROUTES = [
  { path: /^\/api\/content$/, mod: content },
  { path: /^\/api\/orders$/, mod: orders },
  { path: /^\/api\/images\/(?<id>[^/]+)$/, mod: image },
  { path: /^\/api\/admin\/me$/, mod: me, admin: true },
  { path: /^\/api\/admin\/login$/, mod: login, admin: true },
  { path: /^\/api\/admin\/logout$/, mod: logout, admin: true },
  { path: /^\/api\/admin\/content$/, mod: adminContent, admin: true },
  { path: /^\/api\/admin\/orders$/, mod: adminOrders, admin: true },
  { path: /^\/api\/admin\/images$/, mod: adminImages, admin: true },
  { path: /^\/api\/admin\/orders\/version$/, mod: adminOrdersVersion, admin: true },
  { path: /^\/api\/admin\/orders\/clear$/, mod: adminOrdersClear, admin: true },
  { path: /^\/api\/admin\/orders\/export$/, mod: adminOrdersExport, admin: true },
  { path: /^\/api\/admin\/orders\/(?<id>[^/]+)$/, mod: adminOrder, admin: true }
];

function handlerFor(mod, method) {
  const name = "onRequest" + method.charAt(0) + method.slice(1).toLowerCase();
  return mod[name] || mod.onRequest;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "/index.html") {
      const asset = await env.ASSETS.fetch(request);
      if (request.method !== "GET" || !asset.ok) return asset;
      return renderHome(request, env, asset);
    }
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);

    for (const r of ROUTES) {
      const m = r.path.exec(path);
      if (!m) continue;
      const handler = handlerFor(r.mod, request.method);
      if (!handler) return fail(405, "That method is not allowed here.");
      const context = { request, env, params: { ...(m.groups || {}) }, waitUntil: (p) => ctx.waitUntil(p) };
      const run = () => handler(context);
      try {
        return r.admin ? await adminGuard.onRequest({ ...context, next: run }) : await run();
      } catch (e) {
        console.error(e);
        if (isDailyLimitError(e)) return fail(503, "The database reached Cloudflare's free daily limit. It resets at midnight UTC (3 AM in Beirut). Orders still go to WhatsApp.", { code: "daily-limit" });
        return fail(500, "Something went wrong on the server. Please try again.");
      }
    }
    return fail(404, "Not found.");
  }
};

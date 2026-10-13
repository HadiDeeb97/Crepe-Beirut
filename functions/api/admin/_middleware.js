// Every /api/admin/* route needs a signed-in admin, except signing in and checking the setup.
import { fail, isAdmin, sameOrigin } from "../../../lib/server.js";

const OPEN = new Set(["/api/admin/login", "/api/admin/me"]);

export async function onRequest({ request, env, next }) {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (request.method !== "GET" && !sameOrigin(request)) return fail(403, "This request came from another site.");
  if (OPEN.has(path)) return next();
  if (!(await isAdmin(request, env))) return fail(401, "Please sign in again.");
  return next();
}

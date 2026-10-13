// GET /api/admin/me: whether the visitor is signed in, and whether the backend is set up.
import { isAdmin, json, dbBinding } from "../../../lib/server.js";

export async function onRequestGet({ request, env }) {
  return json({
    signedIn: await isAdmin(request, env),
    setup: { database: !!dbBinding(env), password: !!env.ADMIN_PASSWORD }
  });
}

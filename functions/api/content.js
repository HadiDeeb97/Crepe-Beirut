// GET /api/content: the live menu, texts and shop settings for the public site.
import { json, loadContent, dbBinding } from "../../lib/server.js";

export async function onRequestGet({ env }) {
  try {
    const { content, updatedAt } = await loadContent(env, { cached: true });
    return json({ content, updatedAt, ordersEnabled: !!dbBinding(env) });
  } catch (e) {
    return json({ error: "Could not load the menu.", detail: String(e.message || e) }, { status: 500 });
  }
}

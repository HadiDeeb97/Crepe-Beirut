// Cloudflare Pages: /menu, a short address that opens the site at the menu.
export function onRequestGet({ request }) {
  return Response.redirect(new URL(request.url).origin + "/#menu", 302);
}

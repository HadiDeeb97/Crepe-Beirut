/*
 * Server-rendered home page.
 * The static index.html is sent with the live theme, texts and menu already filled in, so the
 * first paint shows the right colours and words and the browser doesn't wait for /api/content.
 * Used by the Worker (src/worker.js) and by Cloudflare Pages (functions/index.js).
 */
import { dbBinding, loadContent } from "./server.js";
import { DEFAULT_THEME, DEFAULT_MEDIA, DISPLAY_FONTS, BODY_FONTS, imageUrl, factsHtml } from "../public/js/shared.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Applies the visitor's own light/dark pick before the first paint (when the shop allows it).
const MODE_SCRIPT = `<script>try{var d=document.documentElement,m=JSON.parse(localStorage.getItem("crepe-beirut-mode")||"null");if(d.dataset.allowToggle==="1"&&(m==="light"||m==="dark")){d.dataset.theme=m;d.style.colorScheme=m}}catch(e){}</script>`;

export async function renderHome(request, env, assetResponse) {
  let data;
  try {
    data = await loadContent(env, { cached: true });
  } catch {
    return assetResponse;
  }
  const c = data.content;
  const t = { ...DEFAULT_THEME, ...(c.theme || {}) };
  const m = { ...DEFAULT_MEDIA, ...(c.media || {}) };
  const s = c.settings;
  const texts = c.texts;
  const df = DISPLAY_FONTS[t.displayFont] || DISPLAY_FONTS.Fraunces;
  const bf = BODY_FONTS[t.bodyFont] || BODY_FONTS.Figtree;
  const customFonts = [t.displayFont !== "Fraunces" && df, t.bodyFont !== "Figtree" && bf].filter(Boolean);
  const style = [
    `--cocoa:${t.brand}`, `--sky:${t.accent}`, `--butter:${t.soft}`, `--cream:${t.background}`,
    `--display:${df.stack}`, `--body:${bf.stack}`, `color-scheme:${t.mode === "auto" ? "light dark" : t.mode}`
  ].join(";");
  // Inline the content for the page script; "<" is escaped so the JSON can't close the tag.
  const boot = JSON.stringify({ content: c, ordersEnabled: !!dbBinding(env) }).replace(/</g, "\\u003c");

  const rw = new HTMLRewriter()
    .on("html", {
      element(el) {
        el.setAttribute("style", style);
        el.setAttribute("data-corners", t.corners);
        el.setAttribute("data-pattern", t.pattern);
        el.setAttribute("data-allow-toggle", t.allowToggle ? "1" : "0");
        if (t.mode !== "auto") el.setAttribute("data-theme", t.mode);
      }
    })
    .on("head", {
      element(el) {
        if (customFonts.length) {
          el.append(`<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
            `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${customFonts.map((f) => "family=" + f.css).join("&")}&display=swap">`, { html: true });
        }
        el.append(`<script id="cb-data" type="application/json">${boot}</script>`, { html: true });
      }
    })
    .on("meta[charset]", { element(el) { el.after(MODE_SCRIPT, { html: true }); } })
    .on('meta[name="theme-color"]', { element(el) { el.setAttribute("content", t.mode === "dark" ? "#1B120B" : t.background); el.removeAttribute("media"); } })
    .on("#pl-display", { element(el) { if (t.displayFont !== "Fraunces") el.remove(); } })
    .on("#pl-body", { element(el) { if (t.bodyFont !== "Figtree") el.remove(); } })
    .on("#pl-hero", { element(el) { if (m.hero) el.setAttribute("href", imageUrl(m.hero)); } })
    .on("[data-text]", {
      element(el) {
        const v = texts[el.getAttribute("data-text")];
        if (v) el.setInnerContent(v);
      }
    })
    .on("[data-text-paras]", {
      element(el) {
        const v = String(texts[el.getAttribute("data-text-paras")] || "");
        el.setInnerContent(v.split(/\n\s*\n/).filter(Boolean).map((p) => "<p>" + esc(p.trim()) + "</p>").join(""), { html: true });
      }
    })
    .on("[data-facts]", {
      element(el) {
        const html = factsHtml(c);
        if (html) el.setInnerContent(html, { html: true }); else el.setAttribute("hidden", "");
      }
    })
    .on("[data-announce]", { element(el) { if (texts.announcement) el.removeAttribute("hidden"); } })
    .on("[data-wa-display]", { element(el) { el.setInnerContent(s.whatsappDisplay); } })
    .on("[data-wa-link]", { element(el) { el.setAttribute("href", "https://wa.me/" + s.whatsappNumber); } })
    .on(".hero-art", {
      element(el) {
        const cls = ["hero-art", m.hero && "has-photo", !m.heroDrawings && "no-drawings"].filter(Boolean).join(" ");
        el.setAttribute("class", cls);
      }
    })
    .on("[data-hero-photo]", {
      element(el) {
        if (!m.hero) return;
        el.setAttribute("src", imageUrl(m.hero));
        el.setAttribute("fetchpriority", "high");
        el.removeAttribute("hidden");
      }
    })
    .on(".hero-crepe", { element(el) { if (m.hero) el.setAttribute("fetchpriority", "low"); } })
    .on(".seal-core", { element(el) { if (m.about) el.setAttribute("class", "seal-core has-photo"); } })
    .on("[data-about-photo]", {
      element(el) {
        if (!m.about) return;
        el.setAttribute("src", imageUrl(m.about));
        el.setAttribute("loading", "lazy");
        el.removeAttribute("hidden");
      }
    });

  const res = rw.transform(assetResponse);
  const headers = new Headers(res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-cache");
  headers.delete("etag");
  headers.delete("content-length");
  return new Response(res.body, { status: assetResponse.status, headers });
}

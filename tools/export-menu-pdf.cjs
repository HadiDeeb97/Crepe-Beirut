/*
 * Export the printable menu (public/menu-print/) to public/menu/:
 *   menu.pdf        the A3 menu, one page per sheet
 *   menu-1.jpg ...  a picture of each page (previews in the admin panel)
 *   menu.json       when it was made, plus the menu it was made from. The site shows this menu
 *                   to new visitors if the live one can't load (e.g. the database's daily limit).
 *
 * Runs on GitHub Actions (.github/workflows/menu-pdf.yml), which commits the files so Cloudflare
 * serves them as plain static files. Locally:
 *   SITE_URL=http://localhost:8788 node tools/export-menu-pdf.cjs
 * To re-print the last exported menu after a design change, add CONTENT_FILE=public/menu/menu.json.
 * Skips the export if neither the menu nor the print design changed since the last one, unless FORCE=1.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const SITE = (process.env.SITE_URL || "https://crepe-beirut.hadidib97.workers.dev").replace(/\/+$/, "");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "menu");
const FORCE = /^(1|true|yes)$/i.test(process.env.FORCE || "");

async function main() {
  let r = { status: "file" }, data = null;
  if (process.env.CONTENT_FILE) {
    // Re-print a saved menu (e.g. public/menu/menu.json after a design change) without the live site.
    const saved = JSON.parse(fs.readFileSync(process.env.CONTENT_FILE, "utf8"));
    data = { content: saved.content, updatedAt: saved.menuUpdatedAt || saved.updatedAt || null };
  } else {
    r = await fetch(SITE + "/api/content", { headers: { accept: "application/json" } });
    data = r.ok ? await r.json().catch(() => null) : null;
  }
  if (!data || !data.content) {
    // Never replace a good export with nothing: keep the last one until the menu loads again.
    throw new Error(`Could not load the live menu from ${SITE}/api/content (HTTP ${r.status}). The last export is kept.`);
  }
  const design = ["print.js", "print.css", "index.html"].map((f) => fs.readFileSync(path.join(ROOT, "public", "menu-print", f), "utf8").replace(/\?v=\d+/g, "")).join("");
  const hash = crypto.createHash("sha256").update(JSON.stringify(data.content)).update(design).digest("hex").slice(0, 16);

  const metaFile = path.join(OUT, "menu.json");
  const last = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : null;
  if (!FORCE && last && last.hash === hash && fs.existsSync(path.join(OUT, "menu.pdf"))) {
    console.log("The menu has not changed since the last export (" + last.exportedAt + "). Nothing to do.");
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1700 } });
    page.on("pageerror", (e) => console.error("page error:", e.message));
    await page.addInitScript((c) => { window.__MENU_CONTENT = c; }, data.content);
    await page.goto(SITE + "/menu-print/?export=1", { waitUntil: "load" });
    await page.waitForFunction(() => window.__menuReady || window.__menuError, null, { timeout: 60000 });
    const err = await page.evaluate(() => window.__menuError);
    if (err) throw new Error("The printable menu failed: " + err);

    await page.pdf({ path: path.join(OUT, "menu.pdf"), preferCSSPageSize: true, printBackground: true });
    const sheets = await page.$$(".sheet");
    const images = [];
    for (let i = 0; i < sheets.length; i++) {
      const name = `menu-${i + 1}.jpg`;
      await sheets[i].screenshot({ path: path.join(OUT, name), type: "jpeg", quality: 72 });
      images.push(name);
    }
    // Drop pictures of pages the menu no longer has.
    for (const f of fs.readdirSync(OUT)) if (/^menu-\d+\.jpg$/.test(f) && !images.includes(f)) fs.unlinkSync(path.join(OUT, f));

    const meta = {
      exportedAt: new Date().toISOString(),
      menuUpdatedAt: data.updatedAt || null,
      hash,
      pages: sheets.length,
      pdf: "menu.pdf",
      images,
      content: data.content
    };
    fs.writeFileSync(metaFile, JSON.stringify(meta));
    console.log(`Exported ${sheets.length} page(s) to public/menu/menu.pdf`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

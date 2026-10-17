/*
 * Printable menu. Lays the published menu out on A3 sheets in the style of the printed card:
 * a header with the "menu" doodle and logo, sections in rounded boxes with a tab, add-ons in a
 * wide box at the end, and the social / WhatsApp strip at the foot of every sheet.
 *
 * Boxes are measured off-screen, then packed into three columns: each one goes where it sits
 * highest (looking a few sections ahead to fill gaps), wide sections take two columns, and a
 * new sheet starts when nothing else fits. tools/export-menu-pdf.cjs prints this page to
 * public/menu/menu.pdf; it waits for window.__menuReady.
 */
import { money, imageUrl } from "../js/shared.js?v=202610171944";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const COLS = 3;
const GAP = 20;           // space between boxes
const SIDE = 30;          // sheet-body inset left and right (print.css .sheet-body)
const TOP = 30;           // sheet-body inset from the top
const FOOT = 100;         // room kept at the bottom for the footer strip
const HEAD = 300;         // header height on the first sheet
const LOOKAHEAD = 3;      // how many sections ahead may jump in to fill a gap
const STRETCH = 320;      // boxes grow up to this much to line up with their neighbours

async function getContent() {
  // The exporter hands over the content it fetched, so the PDF matches its record exactly.
  if (window.__MENU_CONTENT) return window.__MENU_CONTENT;
  try {
    const r = await fetch("/api/content", { headers: { accept: "application/json" } });
    if (r.ok) {
      const data = await r.json();
      if (data.content) return data.content;
    }
  } catch { /* fall back to the built-in menu */ }
  const m = await import("../js/defaults.js?v=202610171944");
  return m.DEFAULT_CONTENT;
}

/* ---------- Turning sections into rows ---------- */

// Sections whose items mostly come in the same sizes (e.g. 12 PCS / 25 PCS) print as a table with a
// price column per size. Otherwise every size gets its own line: "Kinder Crepe (6 fingers)".
function sectionBody(cat) {
  const items = cat.items || [];
  const labels = [];
  let sized = 0;
  for (const it of items) {
    if (!it.options || !it.options.length) continue;
    sized++;
    for (const o of it.options) if (!labels.includes(o.label)) labels.push(o.label);
  }
  if (labels.length >= 2 && labels.length <= 4 && sized * 2 >= items.length) {
    return {
      table: labels,
      rows: items.map((it) => ({
        name: it.name,
        out: !it.available,
        cells: labels.map((l, i) => {
          if (!it.options.length) return i === 0 ? it.price : null;
          const o = it.options.find((o) => o.label === l);
          return o ? o.price : null;
        })
      }))
    };
  }
  const rows = [];
  for (const it of items) {
    if (it.options && it.options.length) for (const o of it.options) rows.push({ name: `${it.name} (${o.label})`, price: o.price, out: !it.available });
    else rows.push({ name: it.name, price: it.price || 0, out: !it.available });
  }
  return { rows };
}

function sectionPic(cat) {
  if (cat.image) return { kind: "img", src: imageUrl(cat.image, "small"), photo: true };
  if (cat.img && cat.img !== "badge") return { kind: "img", src: `../assets/img/${cat.img}.webp`, photo: false };
  return { kind: "mark" };
}

function buildBoxes(content) {
  const boxes = [];
  for (const cat of content.categories || []) {
    if (cat.visible === false || !(cat.items || []).length) continue;
    const body = sectionBody(cat);
    const n = body.rows.length;
    const choice = cat.choice && cat.choice.values && cat.choice.values.length ? ` <small>(${esc(cat.choice.values.join(" & "))})</small>` : "";
    boxes.push({
      title: esc(cat.name) + choice,
      pic: sectionPic(cat),
      table: body.table || null,
      rows: body.rows,
      span: body.table ? 2 : n > 16 ? 2 : 1,
      cols: body.table ? 1 : n > 16 ? 2 : 1
    });
  }
  const groups = (content.extras || []).map((g) => ({ name: g.name, items: (g.items || []).filter((x) => x.available !== false) })).filter((g) => g.items.length);
  if (groups.length) {
    const rows = [];
    for (const g of groups) {
      if (groups.length > 1) rows.push({ group: g.name });
      for (const x of g.items) rows.push({ name: x.name, price: x.price });
    }
    const n = rows.length;
    boxes.push({ title: "Add-ons", pic: { kind: "plus" }, table: null, rows, span: n <= 8 ? 1 : n <= 18 ? 2 : 3, cols: n <= 8 ? 1 : n <= 18 ? 2 : 3 });
  }
  return boxes;
}

/* ---------- HTML ---------- */

const priceCell = (p, out) => (out ? '<span class="pr out">Sold out</span>' : `<span class="pr">${money(p)}</span>`);

function rowsHtml(box, rows) {
  if (box.table) {
    const head = `<tr><th></th>${box.table.map((l) => `<th>${esc(l)}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr><td class="nm">${esc(r.name)}</td>${r.cells.map((c, i) => {
      if (r.out) return i === 0 ? `<td class="out" colspan="${r.cells.length}" style="text-align:right">Sold out</td>` : "";
      return c == null ? '<td class="none">–</td>' : `<td class="pr">${money(c)}</td>`;
    }).join("")}</tr>`).join("");
    return `<table class="tbl">${head}${body}</table>`;
  }
  return `<ul class="rows" data-cols="${box.cols}">${rows.map((r) => r.group
    ? `<li class="row grp">${esc(r.group)}</li>`
    : `<li class="row"><span class="nm">${esc(r.name)}</span>${priceCell(r.price, r.out)}</li>`).join("")}</ul>`;
}

function picHtml(pic) {
  if (pic.kind === "img") return `<img class="tab-pic${pic.photo ? " photo" : ""}" src="${esc(pic.src)}" alt="">`;
  if (pic.kind === "plus") return '<svg class="tab-pic plus" aria-hidden="true"><use href="#i-plus"></use></svg>';
  return '<svg class="tab-pic mark" aria-hidden="true"><use href="#cb-mark"></use></svg>';
}

const boxHtml = (box) => `<div class="box"><div class="tab">${picHtml(box.pic)}<h2 class="tab-name">${box.title}</h2></div>${rowsHtml(box, box.rows)}</div>`;

function footHtml(s) {
  const icons = [["instagram", "i-ig"], ["facebook", "i-fb"], ["tiktok", "i-tt"]]
    .filter(([k]) => s[k]).map(([, id]) => `<i><svg aria-hidden="true"><use href="#${id}"></use></svg></i>`).join("");
  let handle = s.shopName;
  try {
    const h = s.instagram && new URL(s.instagram).pathname.split("/").filter(Boolean)[0];
    if (h) handle = h.charAt(0).toUpperCase() + h.slice(1);
  } catch { /* keep the shop name */ }
  return `<footer class="foot">
    <div class="social">${icons}<span>${esc(handle)}</span></div>
    <div class="motto">THE SWEET SIDE OF BEIRUT</div>
    <div class="wa"><svg aria-hidden="true"><use href="#i-wa"></use></svg>${esc(s.whatsappDisplay || "")}</div>
  </footer>`;
}

const headHtml = () => `<div class="head">
  <img class="doodle" src="../assets/img/print/menu-doodle.webp" alt="">
  <div class="center">
    <div class="badge"><i><svg aria-hidden="true"><use href="#cb-mark"></use></svg></i></div>
    <svg class="word" aria-hidden="true"><use href="#cb-word"></use></svg>
    <div class="tag">THE SWEET SIDE OF BEIRUT</div>
  </div>
  <img class="dots" src="../assets/img/print/spreader-dots.webp" alt="">
</div>`;

/* ---------- Layout ---------- */

function layout(boxes, W, maxY) {
  const colW = (W - GAP * (COLS - 1)) / COLS;
  const width = (span) => colW * span + GAP * (span - 1);
  const x = (c) => c * (colW + GAP);
  const doodleH = Math.round(colW * 662 / 700);
  const measure = $("[data-measure]");

  const heightOf = (box, rows) => {
    measure.innerHTML = `<div class="block" style="position:relative;width:${width(box.span)}px">${boxHtml({ ...box, rows })}</div>`;
    return measure.firstElementChild.offsetHeight;
  };

  // Measure every box, splitting any that would not fit even on an empty sheet.
  const queue = [];
  for (const box of boxes) {
    let rest = box.rows;
    let first = true;
    const limit = maxY - (box.span === COLS ? doodleH + GAP : 0);
    while (rest.length) {
      let take = rest.length;
      const part = first ? box : { ...box, title: box.title + " <small>(continued)</small>" };
      let h = heightOf(part, rest);
      if (h > limit) {
        let lo = 1, hi = rest.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (heightOf(part, rest.slice(0, mid)) <= limit) lo = mid; else hi = mid - 1;
        }
        take = lo;
        h = heightOf(part, rest.slice(0, take));
      }
      queue.push({ ...part, rows: rest.slice(0, take), h });
      rest = rest.slice(take);
      first = false;
    }
  }
  measure.innerHTML = "";

  const sheets = [];
  const newSheet = () => {
    const first = !sheets.length;
    const s = { first, placed: [], tops: Array(COLS).fill(first ? HEAD : 0) };
    if (!first) {
      // Later sheets open with the doodle in the first column, like the printed menu's back page.
      s.placed.push({ doodle: true, col: 0, span: 1, y: 0, h: doodleH });
      s.tops[0] = doodleH + GAP;
    }
    sheets.push(s);
    return s;
  };
  const spot = (box, s) => {
    let best = null;
    for (let c = 0; c + box.span <= COLS; c++) {
      const y = Math.max(...s.tops.slice(c, c + box.span));
      if (!best || y < best.y) best = { col: c, y };
    }
    best.fits = best.y + box.h <= maxY;
    return best;
  };

  let s = newSheet();
  const pending = queue.slice();
  while (pending.length) {
    let pick = -1, pos = null;
    for (let i = 0; i < Math.min(LOOKAHEAD, pending.length); i++) {
      const p = spot(pending[i], s);
      if (p.fits && (!pos || p.y < pos.y - 30)) { pick = i; pos = p; }
    }
    if (pick < 0) {
      for (let i = LOOKAHEAD; i < pending.length; i++) {
        const p = spot(pending[i], s);
        if (p.fits) { pick = i; pos = p; break; }
      }
    }
    if (pick < 0) {
      const empty = !s.placed.some((b) => !b.doodle);
      if (!empty) { s = newSheet(); continue; }
      pick = 0; pos = spot(pending[0], s);     // too tall for any sheet: place it anyway
    }
    const box = pending.splice(pick, 1)[0];
    s.placed.push({ ...box, col: pos.col, y: pos.y });
    for (let c = pos.col; c < pos.col + box.span; c++) s.tops[c] = pos.y + box.h + GAP;
  }

  // Grow boxes a little so neighbours line up at the bottom, like the printed card.
  for (const sh of sheets) {
    const bottom = Math.max(...sh.placed.map((b) => b.y + b.h));
    for (const b of sh.placed) {
      if (b.doodle) continue;
      let target = bottom;
      for (const o of sh.placed) {
        if (o === b || o.y <= b.y) continue;
        const overlap = o.col < b.col + b.span && b.col < o.col + o.span;
        if (overlap) target = Math.min(target, o.y - GAP);
      }
      const grow = target - (b.y + b.h);
      if (grow > 0 && grow <= STRETCH) b.h += grow;
    }
  }
  return { sheets, x, width };
}

/* ---------- Page ---------- */

function applyTheme(t) {
  if (!t) return;
  const root = document.documentElement.style;
  if (t.brand) root.setProperty("--brand", t.brand);
  if (t.accent) root.setProperty("--accent", t.accent);
  if (t.soft) root.setProperty("--soft", t.soft);
  if (t.background) root.setProperty("--paper", t.background);
}

// Long section names shrink to fit their tab instead of being cut off.
function fitTitles(host) {
  for (const h of host.querySelectorAll(".tab-name")) {
    let size = parseFloat(getComputedStyle(h).fontSize);
    while (h.scrollWidth > h.clientWidth + 1 && size > 14) h.style.fontSize = (size -= 1) + "px";
  }
}

function fitToScreen() {
  const sheet = $(".sheet");
  if (!sheet) return;
  const isExport = document.documentElement.classList.contains("export");
  const s = isExport ? 1 : Math.min(1, (window.innerWidth - 32) / sheet.offsetWidth);
  document.documentElement.style.setProperty("--s", s.toFixed(4));
}

async function render() {
  const content = await getContent();
  applyTheme(content.theme);
  await Promise.all([document.fonts.load('750 25px "Fraunces"'), document.fonts.load('600 15px "Figtree"'), document.fonts.ready]).catch(() => {});

  const host = $("[data-sheets]");
  // Sheet size in CSS pixels (A3 is 297 × 420 mm).
  host.innerHTML = '<div class="sheet-wrap"><section class="sheet"></section></div>';
  const probe = $(".sheet", host);
  const sheetW = probe.offsetWidth, sheetH = probe.offsetHeight;
  const W = sheetW - SIDE * 2;
  const maxY = sheetH - TOP - FOOT;

  const { sheets, x, width } = layout(buildBoxes(content), W, maxY);
  const foot = footHtml(content.settings || {});
  host.innerHTML = sheets.map((sh) => `<div class="sheet-wrap"><section class="sheet"><div class="sheet-body">
    ${sh.first ? headHtml() : ""}
    ${sh.placed.map((b) => b.doodle
      ? `<div class="block doodle-block" style="left:${x(b.col)}px;top:${b.y}px;width:${width(1)}px;padding:0"><img src="../assets/img/print/menu-doodle.webp" alt=""></div>`
      : `<section class="block" style="left:${x(b.col)}px;top:${b.y}px;width:${width(b.span)}px;height:${b.h}px">${boxHtml(b)}</section>`).join("")}
  </div>${foot}</section></div>`).join("");

  fitTitles(host);
  fitToScreen();
  await Promise.all([...host.querySelectorAll("img")].map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {}))));
  window.__menuPages = sheets.length;
  window.__menuReady = true;
}

$("[data-print]").addEventListener("click", () => window.print());
window.addEventListener("resize", fitToScreen);
fetch("../menu/menu.json", { cache: "no-store" }).then((r) => { if (r.ok) $("[data-last-pdf]").hidden = false; }).catch(() => {});

render().catch((e) => {
  console.error(e);
  $("[data-sheets]").innerHTML = '<p class="status">Sorry, the menu could not be laid out. Reload the page to try again.</p>';
  window.__menuError = String(e && e.message || e);
});

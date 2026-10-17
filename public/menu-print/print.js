/*
 * Printable menu. Lays the published menu out on A3 sheets in the Crepe Beirut brand: a striped
 * awning with the CB badge, typeset sections with dotted price leaders, an add-ons band, and the
 * Instagram / WhatsApp footer on every sheet. It uses the two fonts and the colours chosen in the
 * admin's Theme screen, and a fixed type scale (print.css).
 *
 * Sections are measured off-screen, then packed into three columns: each goes where it sits
 * highest (looking a few sections ahead to fill gaps), size tables take two columns, and a new
 * sheet starts when nothing else fits. tools/export-menu-pdf.cjs prints this page to
 * public/menu/menu.pdf; it waits for window.__menuReady.
 */
import { imageUrl, DISPLAY_FONTS, BODY_FONTS } from "../js/shared.js?v=202610172125";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");

const COLS = 3;
const GUTTER = 40;        // space between columns
const GAP = 30;           // space between sections in a column
const SIDE = 56;          // sheet margin left and right (print.css .sheet-body)
const FIRST_TOP = 352;    // content starts below the masthead on the first sheet
const NEXT_TOP = 140;     // ...and below the small badge on later sheets
const BOTTOM = 112;       // room kept for the footer
const LOOKAHEAD = 3;      // how many sections ahead may jump in to fill a gap

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
  const m = await import("../js/defaults.js?v=202610172125");
  return m.DEFAULT_CONTENT;
}

/* ---------- Theme: colours and the two fonts ---------- */

async function applyTheme(t = {}) {
  const root = document.documentElement.style;
  for (const [k, v] of [["--brand", t.brand], ["--accent", t.accent], ["--soft", t.soft], ["--paper", t.background]]) if (v) root.setProperty(k, v);
  const dName = DISPLAY_FONTS[t.displayFont] ? t.displayFont : "Fraunces";
  const bName = BODY_FONTS[t.bodyFont] ? t.bodyFont : "Figtree";
  const df = DISPLAY_FONTS[dName], bf = BODY_FONTS[bName];
  root.setProperty("--display", df.stack);
  root.setProperty("--display-weight", String(df.weight || 700));
  root.setProperty("--body", bf.stack);
  // Fraunces and Figtree come with the site; other choices load from Google Fonts.
  const custom = [dName !== "Fraunces" && df, bName !== "Figtree" && bf].filter(Boolean);
  if (custom.length) {
    await new Promise((done) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?" + custom.map((f) => "family=" + f.css).join("&") + "&display=block";
      l.onload = l.onerror = done;
      setTimeout(done, 8000);
      document.head.appendChild(l);
    });
  }
  await Promise.all([
    document.fonts.load(`${df.weight || 700} 28px "${dName}"`),
    document.fonts.load(`700 15px "${bName}"`),
    document.fonts.load(`400 15px "${bName}"`)
  ]).catch(() => {});
  await document.fonts.ready;
}

/* ---------- Turning sections into rows ---------- */

// Sections whose items mostly come in the same sizes (e.g. 12 PCS / 25 PCS) print as a table with a
// price column per size. Otherwise an item with sizes gets a line per size under its name.
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
        name: it.name, desc: it.desc,
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
    const opts = it.options || [];
    if (opts.length === 1) rows.push({ name: `${it.name} (${opts[0].label})`, price: opts[0].price, desc: it.desc });
    else if (opts.length) {
      rows.push({ name: it.name, desc: it.desc, head: true });
      for (const o of opts) rows.push({ name: o.label, price: o.price, sub: true });
    } else rows.push({ name: it.name, price: it.price || 0, desc: it.desc });
  }
  return { rows };
}

function sectionPic(cat) {
  if (cat.image) return { kind: "img", src: imageUrl(cat.image, "small"), photo: true };
  if (cat.img && cat.img !== "badge") return { kind: "img", src: `../assets/img/${cat.img}.webp` };
  return { kind: "mark" };
}

const listWords = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

function buildBoxes(content) {
  const boxes = [];
  const visible = (content.categories || []).filter((c) => c.visible !== false && (c.items || []).length);
  for (const cat of visible) {
    const body = sectionBody(cat);
    const n = body.rows.length;
    const choice = cat.choice && cat.choice.values && cat.choice.values.length ? `<small>${esc(cat.choice.values.join(" or "))}</small>` : "";
    boxes.push({
      title: esc(cat.name) + choice,
      note: cat.blurb || "",
      pic: sectionPic(cat),
      table: body.table || null,
      rows: body.rows,
      span: body.table ? 2 : n > 24 ? 2 : 1,
      cols: body.table ? 1 : n > 24 ? 2 : 1
    });
  }
  const groups = (content.extras || []).filter((g) => (g.items || []).length);
  if (groups.length) {
    const rows = [];
    for (const g of groups) {
      if (groups.length > 1) rows.push({ group: g.name });
      for (const x of g.items) rows.push({ name: x.name, price: x.price });
    }
    const onIds = new Set(groups.flatMap((g) => g.sections || []));
    const on = visible.filter((c) => onIds.has(c.id)).map((c) => c.name.toLowerCase());
    const n = rows.length;
    boxes.push({
      addons: true,
      title: "Add-ons",
      note: on.length ? "Add to your " + listWords(on) + "." : "",
      pic: { kind: "plus" },
      rows,
      span: n <= 10 ? 1 : n <= 20 ? 2 : 3,
      cols: n <= 10 ? 1 : n <= 20 ? 2 : 4
    });
  }
  return boxes;
}

/* ---------- HTML ---------- */

const markSvg = '<svg class="mark" aria-hidden="true"><use href="#cb-mark"></use></svg>';
const ico = (id) => `<svg aria-hidden="true"><use href="#${id}"></use></svg>`;

function picHtml(pic) {
  if (pic.kind === "img") return `<span class="pic"><img${pic.photo ? ' class="photo"' : ""} src="${esc(pic.src)}" alt=""></span>`;
  if (pic.kind === "plus") return `<span class="pic plus">${ico("i-plus")}</span>`;
  return `<span class="pic">${markSvg}</span>`;
}

const desc = (r) => (r.desc ? `<span class="ds">${esc(r.desc)}</span>` : "");

function rowsHtml(box, rows) {
  if (box.table) {
    const head = `<span></span>${box.table.map((l) => `<span class="th label">${esc(l)}</span>`).join("")}`;
    const body = rows.map((r) => `<div class="tn"><span class="nm">${esc(r.name)}${desc(r)}</span><i class="dots"></i></div>${r.cells.map((c) =>
      c == null ? '<span class="tp none">–</span>' : `<span class="tp">${num(c)}</span>`).join("")}`).join("");
    return `<div class="tbl" style="--n:${box.table.length}">${head}${body}</div>`;
  }
  return `<ul class="rows" data-cols="${box.cols}">${rows.map((r) => {
    if (r.group) return `<li class="row grp label">${esc(r.group)}</li>`;
    if (r.head) return `<li class="row"><div class="line"><span class="nm">${esc(r.name)}</span></div>${desc(r)}</li>`;
    return `<li class="row${r.sub ? " sub" : ""}"><div class="line"><span class="nm">${esc(r.name)}</span><i class="dots"></i><span class="pr">${num(r.price)}</span></div>${desc(r)}</li>`;
  }).join("")}</ul>`;
}

function boxHtml(box) {
  const head = `<div class="sec-head">${picHtml(box.pic)}<div class="sec-title"><h2>${box.title}</h2>${box.note ? `<p>${esc(box.note)}</p>` : ""}</div></div>`;
  const inner = head + rowsHtml(box, box.rows);
  return box.addons ? `<div class="addons">${inner}</div>` : inner;
}

function footHtml(s) {
  let handle = "";
  try {
    const h = s.instagram && new URL(s.instagram).pathname.split("/").filter(Boolean)[0];
    if (h) handle = "@" + h;
  } catch { /* no Instagram link */ }
  return `<footer class="foot">
    <div class="item">${handle ? ico("i-ig") + esc(handle) : esc(s.shopName || "")}</div>
    <div class="label">The sweet side of Beirut</div>
    <div class="item">${ico("i-wa")}Order on WhatsApp ${esc(s.whatsappDisplay || "")}</div>
  </footer><div class="base"></div>`;
}

function mastheadHtml(s) {
  const usd = s.showUsd && s.usdRate > 0 ? ` · $1 = ${num(s.usdRate)} L.L.` : "";
  return `<div class="awning"></div>
  <div class="masthead">
    <div class="badge"><i>${markSvg}</i></div>
    <svg class="word" aria-hidden="true"><use href="#cb-word"></use></svg>
    <div class="tag label">The sweet side of Beirut</div>
    <div class="note label" style="left:${SIDE}px;right:${SIDE}px">Menu · Prices in Lebanese pounds (L.L.)${esc(usd)}</div>
  </div>`;
}

const miniHtml = () => `<div class="awning"></div><div class="mini"><div class="badge"><i>${markSvg}</i></div></div>`;

/* ---------- Layout ---------- */

function layout(boxes, W, sheetH) {
  const colW = (W - GUTTER * (COLS - 1)) / COLS;
  const width = (span) => colW * span + GUTTER * (span - 1);
  const x = (c) => c * (colW + GUTTER);
  const maxY = sheetH - BOTTOM;
  const measure = $("[data-measure]");

  const heightOf = (box, rows) => {
    measure.innerHTML = `<div class="block" style="position:relative;width:${width(box.span)}px">${boxHtml({ ...box, rows })}</div>`;
    return measure.firstElementChild.offsetHeight;
  };

  // Measure every section, splitting any that would not fit even on an empty sheet.
  const queue = [];
  const limit = maxY - NEXT_TOP;
  for (const box of boxes) {
    let rest = box.rows;
    let first = true;
    while (rest.length) {
      const part = first ? box : { ...box, note: "", title: box.title + "<small>continued</small>" };
      let take = rest.length;
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

  const spot = (box, tops, limitY) => {
    let best = null;
    for (let c = 0; c + box.span <= COLS; c++) {
      const y = Math.max(...tops.slice(c, c + box.span));
      if (!best || y < best.y) best = { col: c, y };
    }
    best.fits = best.y + box.h <= limitY;
    return best;
  };
  // Fill one sheet from the queue: each section goes where it sits highest, and a section a few
  // places further on may jump ahead if it fits higher up. Returns what didn't fit.
  const packSheet = (items, top, limitY) => {
    const tops = Array(COLS).fill(top);
    const placed = [];
    const left = items.slice();
    while (left.length) {
      let pick = -1, pos = null;
      for (let i = 0; i < Math.min(LOOKAHEAD, left.length); i++) {
        const p = spot(left[i], tops, limitY);
        if (p.fits && (!pos || p.y < pos.y - 30)) { pick = i; pos = p; }
      }
      if (pick < 0) {
        for (let i = LOOKAHEAD; i < left.length; i++) {
          const p = spot(left[i], tops, limitY);
          if (p.fits) { pick = i; pos = p; break; }
        }
      }
      if (pick < 0) {
        if (placed.length) break;
        pick = 0; pos = spot(left[0], tops, limitY);   // too tall for any sheet: place it anyway
      }
      const box = left.splice(pick, 1)[0];
      placed.push({ ...box, col: pos.col, y: pos.y });
      for (let c = pos.col; c < pos.col + box.span; c++) tops[c] = pos.y + box.h + GAP;
    }
    return { placed, left, tops };
  };

  const sheets = [];
  let pending = queue;
  while (pending.length) {
    const first = !sheets.length;
    const r = packSheet(pending, first ? FIRST_TOP : NEXT_TOP, maxY);
    sheets.push({ first, placed: r.placed });
    pending = r.left;
  }

  // A last sheet holding only full-width sections (like the add-ons): try to make room for them at
  // the foot of the sheet before by packing that sheet's sections into a shorter space.
  const last = sheets[sheets.length - 1];
  if (sheets.length > 1 && last.placed.every((b) => b.span === COLS)) {
    const prev = sheets[sheets.length - 2];
    const wide = last.placed.map(({ col, y, ...b }) => b);
    const need = wide.reduce((n, b) => n + b.h + GAP, 0);
    const items = prev.placed.map(({ col, y, ...b }) => b);
    const top = prev.first ? FIRST_TOP : NEXT_TOP;
    // First in menu order; if that leaves no room, tallest first (which balances the columns best).
    let r = packSheet(items, top, maxY - need);
    if (r.left.length) r = packSheet(items.slice().sort((p, q) => q.span - p.span || q.h - p.h), top, maxY - need);
    if (!r.left.length) {
      let y = Math.max(...r.tops);
      for (const b of wide) { r.placed.push({ ...b, col: 0, y }); y += b.h + GAP; }
      prev.placed = r.placed;
      sheets.pop();
    }
  }
  return { sheets, x, width };
}

/* ---------- Page ---------- */

function fitToScreen() {
  const sheet = $(".sheet");
  if (!sheet) return;
  const isExport = document.documentElement.classList.contains("export");
  const s = isExport ? 1 : Math.min(1, (window.innerWidth - 32) / sheet.offsetWidth);
  document.documentElement.style.setProperty("--s", s.toFixed(4));
}

async function render() {
  const content = await getContent();
  await applyTheme(content.theme);
  const settings = content.settings || {};

  const host = $("[data-sheets]");
  // Sheet size in CSS pixels (A3 is 297 × 420 mm).
  host.innerHTML = '<div class="sheet-wrap"><section class="sheet"></section></div>';
  const probe = $(".sheet", host);
  const sheetW = probe.offsetWidth, sheetH = probe.offsetHeight;

  const { sheets, x, width } = layout(buildBoxes(content), sheetW - SIDE * 2, sheetH);
  const foot = footHtml(settings);
  host.innerHTML = sheets.map((sh) => `<div class="sheet-wrap"><section class="sheet">
    ${sh.first ? mastheadHtml(settings) : miniHtml()}
    <div class="sheet-body">${sh.placed.map((b) =>
      `<section class="block" style="left:${x(b.col)}px;top:${b.y}px;width:${width(b.span)}px;height:${b.h}px">${boxHtml(b)}</section>`).join("")}</div>
    ${foot}</section></div>`).join("");

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
  window.__menuError = String((e && e.message) || e);
});

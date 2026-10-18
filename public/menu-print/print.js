/*
 * Printable menu. Lays the published menu out on A3 sheets in the Crepe Beirut brand: a striped
 * awning with the CB badge, typeset sections with dotted price leaders, an add-ons band, and the
 * Instagram / WhatsApp footer on every sheet. It uses the two fonts and the colours chosen in the
 * admin's Theme screen, and a fixed type scale (print.css).
 *
 * Sections are measured off-screen, then laid out in rows of three columns so their titles line
 * up: each row groups sections of similar length (size tables take two columns, short sections
 * can share a column), spare space is spread between rows, and a new sheet starts when the next
 * row doesn't fit. tools/export-menu-pdf.cjs prints this page to
 * public/menu/menu.pdf; it waits for window.__menuReady.
 */
import { imageUrl, DISPLAY_FONTS, BODY_FONTS, fontFamily, selfHostedCss, fromGoogle } from "../js/shared.js?v=202610181757";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const num = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");

const COLS = 3;
const GUTTER = 40;        // space between columns
const GAP = 26;           // space between sections in a column
const SIDE = 56;          // sheet margin left and right (print.css .sheet-body)
const FIRST_TOP = 352;    // content starts below the masthead on the first sheet
const NEXT_TOP = 130;     // ...and below the small badge on later sheets
const BOTTOM = 112;       // room kept for the footer

async function getContent() {
  // The exporter hands over the content it fetched, so the PDF matches its record exactly.
  if (window.__MENU_CONTENT) return window.__MENU_CONTENT;
  // The admin's "Preview" shows unpublished changes (the admin saves them here, same site).
  if (/[?&]preview=1/.test(location.search)) {
    try { const saved = JSON.parse(localStorage.getItem("cb-pdf-preview") || "null"); if (saved && saved.categories) return saved; } catch { /* use the published menu */ }
  }
  try {
    const r = await fetch("/api/content", { headers: { accept: "application/json" } });
    if (r.ok) {
      const data = await r.json();
      if (data.content) return data.content;
    }
  } catch { /* fall back to the built-in menu */ }
  const m = await import("../js/defaults.js?v=202610181757");
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
  // Fraunces and Figtree come with print.css; fonts hosted on the site get an @font-face; the rest load from Google Fonts.
  const own = [...new Set([selfHostedCss(df), selfHostedCss(bf)])].join("");
  if (own) {
    const st = document.createElement("style");
    st.textContent = own;
    document.head.appendChild(st);
  }
  const custom = [df, bf].filter(fromGoogle);
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
    document.fonts.load(`${df.weight || 700} 28px "${fontFamily(df)}"`),
    document.fonts.load(`700 15px "${fontFamily(bf)}"`),
    document.fonts.load(`400 15px "${fontFamily(bf)}"`)
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
      id: cat.id,
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
      id: "addons",
      addons: true,
      title: "Add-ons",
      note: on.length ? "Add to your " + listWords(on) + "." : "",
      pic: { kind: "plus" },
      rows,
      span: n <= 10 ? 1 : n <= 20 ? 2 : 3,
      cols: n <= 10 ? 1 : n <= 20 ? 2 : 4
    });
  }
  return arrange(boxes, content.pdf);
}

// The admin's choices (Menu → Menu PDF → Arrange): sections hidden from the PDF, and in "My order"
// mode the order and which sections start a new page. Sections added later go at the end.
function arrange(boxes, pdf) {
  if (!pdf) return boxes;
  const hidden = new Set(pdf.hidden || []);
  let list = boxes.filter((b) => !hidden.has(b.id));
  if (pdf.mode === "custom") {
    const pos = new Map((pdf.order || []).map((id, i) => [id, i]));
    const rank = (b, i) => (pos.has(b.id) ? pos.get(b.id) : 10000 + i);
    list = list.map((b, i) => ({ b, r: rank(b, i) })).sort((p, q) => p.r - q.r).map((x) => x.b);
    const np = new Set(pdf.newPage || []);
    for (const b of list) b.newPage = np.has(b.id);
  }
  return list;
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

function layout(boxes, W, sheetH, custom = false) {
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
      const part = first ? box : { ...box, newPage: false, note: "", title: box.title + "<small>continued</small>" };
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

  // Rows: every section in a row starts on the same line, so titles, rules and first items line
  // up across the page. A row takes the next section in menu order plus the sections close behind
  // it whose length is nearest to it (least empty space), and a short section can sit under
  // another one in the same column when it fits in the row's height.
  const buildRow = (pending, window) => {
    const first = pending[0];
    if (first.span >= COLS) return { members: [{ box: first, col: 0, dy: 0 }], used: new Set([0]), h: first.h };
    const cand = pending.slice(1, 1 + window).map((box, k) => ({ box, i: k + 1 })).filter((c) => c.box.span < COLS);
    const combos = [[]];
    for (let a = 0; a < cand.length; a++) {
      combos.push([cand[a]]);
      for (let b = a + 1; b < cand.length; b++) combos.push([cand[a], cand[b]]);
    }
    let best = null;
    for (const combo of combos) {
      const span = first.span + combo.reduce((n, c) => n + c.box.span, 0);
      if (span > COLS) continue;
      const all = [{ box: first, i: 0 }, ...combo];
      const h = Math.max(...all.map((c) => c.box.h));
      const waste = all.reduce((n, c) => n + (h - c.box.h) * c.box.span, 0) + (COLS - span) * h;
      const cost = waste + combo.reduce((n, c) => n + c.i, 0) * 12;      // keep close to menu order
      if (!best || cost < best.cost) best = { all, h, cost };
    }
    // Left to right in menu order.
    const members = [];
    const used = new Set();
    let col = 0;
    for (const c of best.all.sort((p, q) => p.i - q.i)) {
      members.push({ box: c.box, col, dy: 0 });
      used.add(c.i);
      col += c.box.span;
    }
    // Fill the space under shorter sections, column by column, with short sections from close
    // behind; ones that start side by side start on the same line.
    const bottoms = Array(COLS).fill(best.h);
    for (const m of members) for (let c = m.col; c < m.col + m.box.span; c++) bottoms[c] = m.box.h;
    for (let c = 0; c < COLS; c++) {
      for (;;) {
        let pick = null;
        pending.slice(1, 1 + window + 4).forEach((box, k) => {
          const i = k + 1;
          if (used.has(i) || box.span !== 1 || bottoms[c] + GAP + box.h > best.h) return;
          if (!pick || box.h > pick.box.h) pick = { box, i };
        });
        if (!pick) break;
        members.push({ box: pick.box, col: c, dy: bottoms[c] + GAP });
        used.add(pick.i);
        bottoms[c] += GAP + pick.box.h;
      }
    }
    return { members, used, h: best.h };
  };

  // Lay rows down a sheet until the next one doesn't fit; returns the sheet and what's left.
  const fillSheet = (items, top, limitY, window) => {
    const rows = [];
    let y = top;
    let left = items.slice();
    while (left.length) {
      const row = buildRow(left, window);
      if (y + row.h > limitY && rows.length) break;
      rows.push({ ...row, y });
      y += row.h + GAP;
      left = left.filter((_, i) => !row.used.has(i));
    }
    return { rows, left, bottom: y - GAP };
  };

  const sheets = [];
  if (custom) {
    // "My order": rows of three in exactly the admin's order, left to right. A section that
    // doesn't fit beside the others starts the next row; titles in a row always line up.
    let sheet = null, y = 0, row = [], used = 0;
    const newSheet = () => {
      sheet = { first: !sheets.length, rows: [], bottom: 0 };
      sheets.push(sheet);
      y = sheet.first ? FIRST_TOP : NEXT_TOP;
    };
    const flush = () => {
      if (!row.length) return;
      const h = Math.max(...row.map((b) => b.h));
      if (y + h > maxY && sheet.rows.length) newSheet();
      let col = 0;
      sheet.rows.push({ members: row.map((box) => { const m = { box, col, dy: 0 }; col += box.span; return m; }), h, y });
      y += h + GAP;
      sheet.bottom = y - GAP;
      row = []; used = 0;
    };
    newSheet();
    for (const box of queue) {
      if (box.newPage && (row.length || sheet.rows.length)) { flush(); newSheet(); }
      if (used + box.span > COLS) flush();
      row.push(box);
      used += box.span;
      if (used >= COLS) flush();
    }
    flush();
  } else {
  let pending = queue;
  while (pending.length) {
    const first = !sheets.length;
    const r = fillSheet(pending, first ? FIRST_TOP : NEXT_TOP, maxY, 4);
    sheets.push({ first, rows: r.rows, bottom: r.bottom, items: pending.filter((b) => !r.left.includes(b)) });
    pending = r.left;
  }

  // A last sheet holding only full-width sections (like the add-ons): try to make room for them at
  // the foot of the sheet before, looking further ahead for sections that pack tighter.
  const last = sheets[sheets.length - 1];
  if (sheets.length > 1 && last.rows.every((r) => r.members.every((m) => m.box.span >= COLS))) {
    const prev = sheets[sheets.length - 2];
    const wide = last.rows.map((r) => r.members[0].box);
    const need = wide.reduce((n, b) => n + b.h + GAP, 0);
    for (const window of [4, 6, 8]) {
      const r = fillSheet(prev.items, prev.first ? FIRST_TOP : NEXT_TOP, maxY - need, window);
      if (r.left.length) continue;
      let y = r.bottom + GAP;
      for (const b of wide) { r.rows.push({ members: [{ box: b, col: 0, dy: 0 }], h: b.h, y }); y += b.h + GAP; }
      prev.rows = r.rows;
      prev.bottom = y - GAP;
      sheets.pop();
      break;
    }
  }

  }

  // Spread spare space evenly between the rows so a sheet doesn't end in a gap.
  for (const [n, sh] of sheets.entries()) {
    const spare = maxY - sh.bottom;
    const extra = sh.rows.length > 1 ? Math.min(spare / (sh.rows.length - 1), n < sheets.length - 1 ? 48 : 20) : 0;
    sh.placed = [];
    sh.rows.forEach((r, k) => {
      for (const m of r.members) sh.placed.push({ ...m.box, col: m.col, y: r.y + k * extra + m.dy });
    });
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

  const { sheets, x, width } = layout(buildBoxes(content), sheetW - SIDE * 2, sheetH, !!(content.pdf && content.pdf.mode === "custom"));
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

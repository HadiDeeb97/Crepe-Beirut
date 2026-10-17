import {
  money, usd, indexContent, priceLine, minPrice, openState, hoursConfigured, formatTime,
  DAYS, DAY_NAMES, shopClock, MAX_QTY, imageUrl, factsHtml, extraGroupsFor, DEFAULT_THEME, DEFAULT_MEDIA, DISPLAY_FONTS, BODY_FONTS, uiText, selfHostedCss, fromGoogle
} from "./shared.js?v=202610172128";

const CART_KEY = "crepe-beirut-order-v2";
const CUSTOMER_KEY = "crepe-beirut-customer-v1";
const CONTENT_CACHE = "crepe-beirut-content-v1";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const imgSrc = (img) => (img && img !== "badge" ? `assets/img/${img}.webp` : "");
// Picture for a section or item: an uploaded photo if there is one, else the section's drawing.
// size "small" uses the thumbnail copy (menu rows, badges, cards); the full picture is for the item pop-up.
const catPic = (cat, size) => (cat.image ? { src: imageUrl(cat.image, size), photo: true } : { src: imgSrc(cat.img), photo: false });
const itemPic = (it, cat, size) => (it.image ? { src: imageUrl(it.image, size), photo: true } : catPic(cat, size));
const plusIco = '<svg class="ico" aria-hidden="true"><use href="#i-plus"></use></svg>';
const markSvg = '<svg aria-hidden="true"><use href="#cb-mark"></use></svg>';
// A website word as set in the admin's Website text screen, with {curly} words filled in.
const T = (key, vars) => uiText(content && content.texts, key, vars);
const itemsWord = (n) => n + " " + T(n === 1 ? "itemOne" : "itemMany");

// The server puts the live content into the page (#cb-data). The built-in menu in defaults.js is
// only downloaded if that's missing and the API can't be reached.
let content = null;
let index = null;
const loadDefaults = () => import("./defaults.js?v=202610172128").then((m) => m.DEFAULT_CONTENT);
let ordersEnabled = false;
let cart = load(CART_KEY, []);
let lastMessage = "";
const CURRENCY_KEY = "crepe-beirut-currency";
let currency = load(CURRENCY_KEY, null);

/* ---------- Currency ---------- */

const usdOn = () => !!(content.settings.showUsd && content.settings.usdRate > 0);
const inUsd = () => usdOn() && (currency || content.settings.defaultCurrency) === "usd";
/** A price for display, in the currency the visitor picked. L.L. stays the price of record. */
const price = (lbp) => (inUsd() ? usd(lbp, content.settings.usdRate) : money(lbp));
const extraPrice = (lbp) => "+" + (inUsd() ? usd(lbp, content.settings.usdRate) : Number(lbp).toLocaleString("en-US"));

function renderCurrency() {
  const sw = $("[data-cur-switch]");
  sw.hidden = !usdOn();
  const cur = inUsd() ? "usd" : "lbp";
  $$("[data-currency]").forEach((r) => (r.checked = r.value === cur));
  const s = content.settings;
  $("[data-price-note]").textContent = inUsd()
    ? T("priceNoteUsd", { rate: s.usdRate.toLocaleString("en-US") })
    : T(usdOn() ? "priceNoteBoth" : "priceNoteLbp");
}

document.addEventListener("change", (e) => {
  if (!e.target.matches("[data-currency]")) return;
  currency = e.target.value;
  save(CURRENCY_KEY, currency);
  renderCurrency();
  renderFavs();
  renderMenu();
  renderBadges();
  renderCart();
  if (sheet.open && sheetHit) updateSheet();
});

/* ---------- Content loading ---------- */

async function fetchContent() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3500);
  try {
    const r = await fetch("/api/content", { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    if (!data.content) throw new Error("No content");
    save(CONTENT_CACHE, data.content);
    return { content: data.content, ordersEnabled: !!data.ordersEnabled };
  } catch {
    const cached = load(CONTENT_CACHE, null);
    if (cached) return { content: cached, ordersEnabled: false };
    // New visitors: the menu from the last PDF export (a plain file, so it loads even when the
    // database is down or past its daily limit), and only then the built-in printed menu.
    const exported = await loadExport();
    if (exported) return { content: exported.content, ordersEnabled: false, exportedAt: exported.exportedAt };
    return { content: await loadDefaults(), ordersEnabled: false };
  } finally {
    clearTimeout(t);
  }
}

async function loadExport() {
  try {
    const r = await fetch("/menu/menu.json", { cache: "no-cache" });
    if (!r.ok) return null;
    const m = await r.json();
    return m && m.content && Array.isArray(m.content.categories) && m.content.categories.length ? m : null;
  } catch {
    return null;
  }
}

function renderOfflineNote(exportedAt) {
  const note = $("[data-offline-note]");
  if (!note) return;
  note.hidden = !exportedAt;
  if (!exportedAt) return;
  let when = "";
  try { when = new Date(exportedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: content.settings.timezone || "Asia/Beirut" }); } catch { /* leave it blank */ }
  $("[data-offline-text]").innerHTML = esc(T("offlineNote")).replace(/\{date\}/g, "<b>" + esc(when || "–") + "</b>");
}

/* ---------- Theme ---------- */

const fontLinks = new Map();
function useFont(spec) {
  if (!spec || spec.builtin) return;
  if (spec.files) {
    // Fonts hosted on the site: the server already added their @font-face for the published theme.
    const css = selfHostedCss(spec);
    if (fontLinks.has(css) || [...document.querySelectorAll("style[data-fonts]")].some((x) => x.textContent.includes(css))) return;
    const st = document.createElement("style");
    st.dataset.fonts = "";
    st.textContent = css;
    document.head.appendChild(st);
    fontLinks.set(css, st);
    return;
  }
  if (!fromGoogle(spec) || fontLinks.has(spec.css)) return;
  // The server already added the link for the published fonts.
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href.includes(spec.css))) { fontLinks.set(spec.css, null); return; }
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=" + spec.css + "&display=swap";
  document.head.appendChild(l);
  fontLinks.set(spec.css, l);
}

const MODE_KEY = "crepe-beirut-mode";
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
const isDark = () => {
  const m = document.documentElement.dataset.theme;
  return m ? m === "dark" : darkMQ.matches;
};

document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-mode-btn]")) return;
  save(MODE_KEY, isDark() ? "light" : "dark");
  applyTheme();
});
darkMQ.addEventListener("change", () => applyTheme());

function applyTheme() {
  const t = { ...DEFAULT_THEME, ...(content.theme || {}) };
  const root = document.documentElement.style;
  root.setProperty("--cocoa", t.brand);
  root.setProperty("--sky", t.accent);
  root.setProperty("--butter", t.soft);
  root.setProperty("--cream", t.background);
  const df = DISPLAY_FONTS[t.displayFont] || DISPLAY_FONTS.Fraunces;
  const bf = BODY_FONTS[t.bodyFont] || BODY_FONTS.Figtree;
  useFont(df);
  useFont(bf);
  root.setProperty("--display", df.stack);
  root.setProperty("--display-weight", String(df.weight || 700));
  root.setProperty("--body", bf.stack);
  document.documentElement.dataset.corners = t.corners;
  document.documentElement.dataset.pattern = t.pattern;
  // Light or dark: the visitor's own pick (if the admin shows the button), else the admin's default
  // (light, dark, or follow the visitor's device).
  const own = t.allowToggle ? load(MODE_KEY, null) : null;
  const mode = own === "light" || own === "dark" ? own : t.mode;
  if (mode === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode === "auto" ? "light dark" : mode;
  const btn = $("[data-mode-btn]");
  btn.hidden = !t.allowToggle;
  const dark = isDark();
  btn.classList.toggle("is-dark", dark);
  const label = T(dark ? "modeLight" : "modeDark");
  btn.setAttribute("aria-label", label);
  btn.title = label;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.background;
}

function renderHeroMedia() {
  const m = { ...DEFAULT_MEDIA, ...(content.media || {}) };
  const art = $(".hero-art");
  art.classList.toggle("has-photo", !!m.hero);
  art.classList.toggle("no-drawings", !m.heroDrawings);
  ["rounded", "circle", "none"].forEach((s) => art.classList.toggle("shape-" + s, !!m.hero && m.heroShape === s));
  art.style.setProperty("--hero-zoom", (m.heroZoom || 100) / 100);
  const photo = $("[data-hero-photo]");
  photo.hidden = !m.hero;
  if (m.hero) photo.src = imageUrl(m.hero);
  const about = $("[data-about-photo]");
  about.hidden = !m.about;
  if (m.about) about.src = imageUrl(m.about);
  $(".seal-core").classList.toggle("has-photo", !!m.about);
}

function setContent(c) {
  content = c;
  index = indexContent(c);
}

/* ---------- Texts & settings ---------- */

function renderTexts() {
  const t = content.texts, s = content.settings;
  $$("[data-text]").forEach((el) => { const v = t[el.dataset.text]; if (v != null && v !== "") el.textContent = v; });
  $$("[data-text-paras]").forEach((el) => {
    el.innerHTML = String(t[el.dataset.textParas] || "").split(/\n\s*\n/).filter(Boolean).map((p) => "<p>" + esc(p.trim()) + "</p>").join("");
  });
  $$("[data-text-ph]").forEach((el) => (el.placeholder = T(el.dataset.textPh)));
  const seal = $("[data-seal]");
  if (seal) seal.textContent = (T("tagline").toUpperCase() + " · ").repeat(2);
  const info = $("[data-sent-info]");
  if (info) info.innerHTML = esc(T("sentText")).replace(/\{phone\}/g, `<b data-wa-display>${esc(s.whatsappDisplay)}</b>`);
  $("[data-announce]").hidden = !t.announcement;

  const wa = "https://wa.me/" + s.whatsappNumber;
  $$("[data-wa-link]").forEach((a) => (a.href = wa));
  $$("[data-wa-display]").forEach((el) => (el.textContent = s.whatsappDisplay));

  $("[data-address-block]").hidden = !s.address;
  $("[data-address]").textContent = s.address;
  const maps = $("[data-maps]");
  maps.hidden = !s.mapsUrl;
  if (s.mapsUrl) maps.href = s.mapsUrl;

  const socials = [["instagram", "Instagram", "i-ig"], ["facebook", "Facebook", "i-fb"], ["tiktok", "TikTok", "i-tt"]].filter(([k]) => s[k]);
  const sw = $("[data-socials]");
  sw.hidden = !socials.length;
  sw.innerHTML = socials.map(([k, label, ico]) =>
    `<a href="${esc(s[k])}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#${ico}"></use></svg>${label}</a>`).join("");

  const facts = $("[data-facts]");
  facts.innerHTML = factsHtml(content);
  facts.hidden = !facts.children.length;
  $("[data-year]").textContent = new Date().getFullYear();
  renderHours();
  renderOpen();
}

function renderHours() {
  const s = content.settings;
  const table = $("[data-hours]");
  const configured = hoursConfigured(s);
  table.hidden = !configured;
  $("[data-visit-card]").classList.toggle("no-hours", !configured);
  $("[data-hours-empty]").hidden = configured;
  if (!configured) return;
  const today = shopClock(s).day;
  table.tBodies[0].innerHTML = DAYS.map((d) => {
    const h = s.hours.find((x) => x.day === d) || {};
    const time = h.closed ? esc(T("dayClosed")) : h.open && h.close ? formatTime(h.open) + " – " + formatTime(h.close) : "—";
    return `<tr class="${d === today ? "today" : ""}"><td>${DAY_NAMES[d]}${d === today ? `<span class="today-tag">${esc(T("today"))}</span>` : ""}</td><td>${time}</td></tr>`;
  }).join("");
}

let openNow = null;
function renderOpen() {
  const st = openState(content.settings, new Date(), content.texts);
  openNow = st.configured ? st.open : null;
  const pill = $("[data-open-pill]");
  pill.hidden = !st.configured;
  pill.classList.toggle("open", !!st.open);
  $("[data-open-fact]").hidden = !st.configured;
  $$("[data-open-label]").forEach((el) => (el.textContent = st.label));
  renderCartNotices();
}

/* ---------- Favourites ---------- */

function renderFavs() {
  const favs = [];
  for (const cat of content.categories) {
    if (!cat.visible) continue;
    for (const it of cat.items) if (it.featured && it.available) favs.push({ it, cat });
  }
  $("[data-favs-section]").hidden = !favs.length;
  const shown = favs.length >= 8 ? 8 : favs.length >= 4 ? 4 : favs.length; // fill whole rows of 4
  $("[data-favs]").innerHTML = favs.slice(0, shown).map(({ it, cat }) => {
    const pic = itemPic(it, cat, "small");
    const from = it.options.length > 1 ? "from " + price(minPrice(it)) : price(minPrice(it));
    return `<li class="fav">
      <div class="fav-pic${pic.photo ? " photo" : ""}">${pic.src ? `<img src="${pic.src}" alt="${pic.photo ? esc(it.name) : ""}" loading="lazy" decoding="async" width="480" height="360">` : `<div class="cat-badge">${markSvg}</div>`}</div>
      <div class="fav-body">
        <span class="fav-cat">${esc(cat.name)}</span>
        <div><div class="fav-name">${esc(it.name)}</div><div class="fav-price">${from}</div></div>
        <button class="add" type="button" data-add="${esc(it.id)}" aria-label="Add ${esc(it.name)}">${plusIco}</button>
      </div>
    </li>`;
  }).join("");
}

/* ---------- Menu ---------- */

function priceHtml(it) {
  if (it.options.length > 1) return it.options.map((o) => `<span><small>${esc(o.label)}</small>${price(o.price)}</span>`).join("");
  if (it.options.length === 1) return price(it.options[0].price);
  return price(it.price);
}

function extrasNote(cat) {
  const groups = extraGroupsFor(content, cat.id);
  if (!groups.length) return "";
  const names = groups.flatMap((g) => g.items.filter((x) => x.available).slice(0, 2).map((x) => x.name)).slice(0, 4);
  return names.length ? `<p class="cat-note">${esc(T("extrasNote", { extras: names.join(", ") }))}</p>` : "";
}

function renderMenu() {
  const cats = content.categories.filter((c) => c.visible && c.items.length);
  $("[data-menu]").innerHTML = cats.map((cat) => {
    const pic = catPic(cat, "small");
    const rows = cat.items.map((it) => {
      const out = !it.available;
      const thumb = it.image ? `<img class="item-pic" src="${imageUrl(it.image, "small")}" alt="" loading="lazy" decoding="async" width="60" height="60">` : "";
      const sub = [it.options.length === 1 ? esc(it.options[0].label) : "", it.desc ? esc(it.desc) : ""].filter(Boolean).join(" · ");
      return `<li class="item${out ? " out" : ""}${thumb ? " has-pic" : ""}" data-item="${esc(it.id)}" data-search="${esc((it.name + " " + cat.name + " " + it.desc).toLowerCase())}">
        ${thumb}<span class="item-name">${esc(it.name)}${it.featured && !out ? `<span class="tag tag-pop">${esc(T("tagPopular"))}</span>` : ""}${out ? `<span class="tag tag-out">${esc(T("tagSoldOut"))}</span>` : ""}${sub ? `<span class="item-desc">${sub}</span>` : ""}</span>
        <span class="item-price">${priceHtml(it)}</span>
        <button class="add" type="button" data-add="${esc(it.id)}" aria-label="${out ? esc(it.name) + " is sold out" : "Add " + esc(it.name)}"${out ? " disabled" : ""}>${plusIco}</button>
      </li>`;
    }).join("");
    return `<section class="cat" id="${esc(cat.id)}" data-cat="${esc(cat.id)}" aria-labelledby="h-${esc(cat.id)}">
      <div class="cat-head">
        <div class="cat-badge${pic.photo ? " photo" : ""}" aria-hidden="true">${pic.src ? `<img src="${pic.src}" alt="" loading="lazy" decoding="async" width="74" height="74">` : markSvg}</div>
        <div><h3 id="h-${esc(cat.id)}">${esc(cat.name)}</h3><p class="cat-meta">${esc(itemsWord(cat.items.length))}${cat.blurb ? " · " + esc(cat.blurb) : ""}</p></div>
      </div>
      <ul class="items">${rows}</ul>
      ${extrasNote(cat)}
    </section>`;
  }).join("");
  const nav = cats.map((c) => `<a href="#${esc(c.id)}" data-nav="${esc(c.id)}">${esc(c.name)}</a>`).join("");
  $("[data-chips]").innerHTML = nav;
  $("[data-rail]").innerHTML = cats.map((c) => `<li><a href="#${esc(c.id)}" data-nav="${esc(c.id)}">${esc(c.name)}<span class="rail-n">${c.items.length}</span></a></li>`).join("");
  applySearch();
  watchSections();
}

function renderBadges() {
  const per = {};
  for (const l of cart) per[l.itemId] = (per[l.itemId] || 0) + l.qty;
  $$("[data-add]").forEach((btn) => {
    const n = per[btn.dataset.add] || 0;
    const row = btn.closest(".item");
    if (row) row.classList.toggle("in", n > 0);
    let b = btn.querySelector(".n");
    if (n > 0) {
      if (!b) { b = document.createElement("span"); b.className = "n"; btn.appendChild(b); }
      b.textContent = n;
    } else if (b) b.remove();
  });
}

/* ---------- Search & section tracking ---------- */

const search = $("#menu-search");
function applySearch() {
  const q = search.value.trim().toLowerCase();
  let any = false;
  $$("[data-cat]").forEach((sec) => {
    let shown = 0;
    $$("[data-item]", sec).forEach((row) => {
      const hit = !q || row.dataset.search.includes(q);
      row.hidden = !hit;
      if (hit) shown++;
    });
    sec.hidden = !shown;
    $$(`[data-nav="${sec.id}"]`).forEach((a) => (a.closest("li") || a).hidden = !shown);
    if (shown) any = true;
  });
  const none = $("[data-no-results]");
  none.hidden = any;
  none.textContent = any ? "" : T("searchNone", { q: search.value.trim() });
}
search.addEventListener("input", applySearch);

let io;
function watchSections() {
  if (!("IntersectionObserver" in window)) return;
  if (io) io.disconnect();
  io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === en.target.id));
      const chip = $(`[data-chips] [data-nav="${en.target.id}"]`);
      const bar = $("[data-chips]");
      if (chip && bar && bar.offsetParent) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
    }
  }, { rootMargin: "-35% 0px -60% 0px" });
  $$("[data-cat]").forEach((s) => io.observe(s));
}

/* ---------- Customise sheet ---------- */

const sheet = $("[data-sheet]");
let sheetHit = null;
let sheetQty = 1;

function needsSheet({ item, cat }) {
  return item.options.length > 1 || cat.extras || !!cat.choice || !!item.desc;
}

function openSheet(hit) {
  sheetHit = hit;
  sheetQty = 1;
  const { item, cat } = hit;
  $("[data-sheet-cat]").textContent = cat.name;
  $("[data-sheet-title]").textContent = item.name;
  const desc = $("[data-sheet-desc]");
  desc.hidden = !item.desc;
  desc.textContent = item.desc;
  const pic = itemPic(item, cat);
  const hero = $("[data-sheet-hero]");
  hero.hidden = !pic.src;
  hero.classList.toggle("photo", pic.photo);
  if (pic.src) $("[data-sheet-img]").src = pic.src;

  let html = "";
  if (item.options.length) {
    html += `<fieldset class="opt-group"><legend>${esc(T(cat.id === "mini-pancakes" ? "sheetBoxSize" : "sheetSize"))}</legend><div class="opts">` +
      item.options.map((o, i) => `<label class="opt"><input type="radio" name="option" value="${esc(o.label)}"${i ? "" : " checked"}><span>${esc(o.label)} <small>${price(o.price)}</small></span></label>`).join("") +
      "</div></fieldset>";
  }
  if (cat.choice) {
    html += `<fieldset class="opt-group"><legend>${esc(cat.choice.label)}</legend><div class="opts">` +
      cat.choice.values.map((v, i) => `<label class="opt"><input type="radio" name="choice" value="${esc(v)}"${i ? "" : " checked"}><span>${esc(v)}</span></label>`).join("") +
      "</div></fieldset>";
  }
  html += extraGroupsFor(content, cat.id).map((g) =>
    `<fieldset class="opt-group" data-max="${g.max || 0}"><legend>${esc(g.name)} <span class="hint">· ${esc(g.max ? T("sheetPickUpTo", { n: g.max }) : T("sheetOptional"))}</span></legend><div class="opts">` +
    g.items.map((x) => `<label class="opt"><input type="checkbox" name="extra" value="${esc(x.id)}"${x.available ? "" : " disabled"}><span>${esc(x.name)} <small>${x.available ? extraPrice(x.price) : esc(T("tagSoldOut"))}</small></span></label>`).join("") +
    "</div></fieldset>").join("");
  html += `<div class="field"><label for="sheet-note">${esc(T("sheetNote"))} <span class="opt">${esc(T("optionalWord"))}</span></label><input id="sheet-note" name="note" maxlength="120" placeholder="${esc(T("sheetNotePlaceholder"))}"></div>`;
  $("[data-sheet-body]").innerHTML = html;
  $("[data-sheet-body]").scrollTop = 0;
  updateSheet();
  if (typeof sheet.showModal === "function") sheet.showModal(); else sheet.setAttribute("open", "");
}

function sheetLine() {
  const f = $("[data-sheet-form]");
  const opt = $('input[name="option"]:checked', f);
  const ch = $('input[name="choice"]:checked', f);
  return {
    itemId: sheetHit.item.id,
    option: opt ? opt.value : "",
    choice: ch ? ch.value : "",
    extras: $$('input[name="extra"]:checked', f).map((i) => i.value),
    note: ($("#sheet-note") || { value: "" }).value.trim(),
    qty: sheetQty
  };
}

function updateSheet() {
  const p = priceLine(index, sheetLine());
  $("[data-sheet-qty]").textContent = sheetQty;
  $("[data-sheet-add]").textContent = T("sheetAdd", { price: price(p.ok ? p.total : 0) });
}
const closeSheet = () => { if (sheet.open) sheet.close(); };
$("[data-sheet-body]").addEventListener("change", (e) => {
  // Respect "pick up to N" on extra groups.
  const box = e.target.closest('input[name="extra"]');
  const group = box && box.closest("[data-max]");
  const max = group ? Number(group.dataset.max) : 0;
  if (box && box.checked && max && $$('input[name="extra"]:checked', group).length > max) {
    box.checked = false;
    toast(T("toastMax", { n: max }));
  }
  updateSheet();
});
$("[data-sheet-minus]").addEventListener("click", () => { sheetQty = Math.max(1, sheetQty - 1); updateSheet(); });
$("[data-sheet-plus]").addEventListener("click", () => { sheetQty = Math.min(MAX_QTY, sheetQty + 1); updateSheet(); });
$("[data-sheet-close]").addEventListener("click", closeSheet);
sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });
$("[data-sheet-form]").addEventListener("submit", (e) => {
  e.preventDefault();
  if (sheetHit) addLine(sheetLine(), $("[data-sheet-add]").getBoundingClientRect());
  closeSheet();
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn || btn.disabled) return;
  const hit = index.items.get(btn.dataset.add);
  if (!hit || !hit.item.available) return;
  if (needsSheet(hit)) openSheet(hit);
  else addLine({ itemId: hit.item.id, option: hit.item.options[0] ? hit.item.options[0].label : "", choice: "", extras: [], note: "", qty: 1 }, btn.getBoundingClientRect());
});

/* ---------- Cart ---------- */

const keyOf = (l) => [l.itemId, l.option, l.choice, [...(l.extras || [])].sort().join("+"), l.note].join("|");

function addLine(line, from) {
  const k = keyOf(line);
  const found = cart.find((l) => keyOf(l) === k);
  if (found) found.qty = Math.min(MAX_QTY, found.qty + line.qty); else cart.push(line);
  commit();
  const hit = index.items.get(line.itemId);
  toast(T("toastAdded", { qty: line.qty, name: hit ? hit.item.name : T("itemOne") }));
  const bump = () => $$("[data-count]").forEach((el) => { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); });
  if (from && hit) flyToBag(from, itemPic(hit.item, hit.cat).src).then(bump); else bump();
}

function commit() {
  save(CART_KEY, cart);
  renderCart();
  renderBadges();
}

const form = $("[data-checkout]");
const orderType = () => ($('input[name="type"]:checked', form) || {}).value || "Delivery";

function totals() {
  let sub = 0, count = 0;
  for (const l of cart) {
    const p = priceLine(index, l);
    if (p.ok) { sub += p.total; count += p.qty; }
  }
  const fee = orderType() === "Delivery" && count ? content.settings.deliveryFee || 0 : 0;
  return { sub, fee, total: sub + fee, count };
}

function lineMeta(p) {
  return [p.option, p.choice, p.extras.length ? "+ " + p.extras.map((x) => x.name).join(", ") : "", p.note ? "“" + p.note + "”" : ""].filter(Boolean).join(" · ");
}

function renderCartNotices() {
  const s = content.settings;
  const paused = !s.orderingOpen;
  $("[data-paused]").hidden = !paused;
  $("[data-paused-text]").textContent = s.pausedMessage;
  $("[data-closed-note]").hidden = paused || openNow !== false || !cart.length;
  const send = $("[data-send]");
  if (send) send.disabled = paused;
}

function renderCart() {
  const t = totals();
  const sent = !$("[data-sent]").hidden;
  const empty = cart.length === 0;
  $("[data-cart-empty]").hidden = !empty || sent;
  $("[data-lines]").hidden = sent;
  $("[data-totals]").hidden = empty || sent;
  form.hidden = empty || sent;
  $("[data-ticket-sub]").textContent = t.count ? `${itemsWord(t.count)} · ${T(orderType() === "Pickup" ? "typePickup" : "typeDelivery").toLowerCase()}` : T("cartNoItems");

  $("[data-lines]").innerHTML = cart.map((l, i) => {
    const p = priceLine(index, l);
    const hit = index.items.get(l.itemId);
    const name = p.ok ? p.name : hit ? hit.item.name : T("lineGone");
    return `<li class="line${p.ok ? "" : " bad"}">
      <span class="line-name">${esc(name)}</span>
      <span class="line-total">${p.ok ? price(p.total) : "—"}</span>
      <span class="line-meta">${p.ok ? esc(lineMeta(p)) : esc(T("lineSoldOut"))}</span>
      <div class="line-ctrl">
        <div class="stepper" role="group" aria-label="Quantity of ${esc(name)}">
          <button type="button" data-dec="${i}" aria-label="One less"><svg class="ico"><use href="#i-minus"></use></svg></button>
          <output>${l.qty}</output>
          <button type="button" data-inc="${i}" aria-label="One more"${p.ok ? "" : " disabled"}><svg class="ico"><use href="#i-plus"></use></svg></button>
        </div>
        <button class="link-btn" type="button" data-remove="${i}">Remove</button>
      </div>
    </li>`;
  }).join("");

  $("[data-subtotal]").textContent = price(t.sub);
  $("[data-fee-row]").hidden = !t.fee;
  $("[data-fee]").textContent = price(t.fee);
  $("[data-total]").textContent = price(t.total);
  const note = $("[data-total-note]");
  const s = content.settings;
  const bits = [];
  // Show the other currency under the total.
  if (usdOn() && t.total) bits.push(inUsd() ? "= " + money(t.total) : "≈ " + usd(t.total, s.usdRate));
  if (!s.deliveryFee && orderType() === "Delivery") bits.push(T("feeNote"));
  note.hidden = !bits.length;
  note.textContent = bits.join(" · ");

  $$("[data-count]").forEach((el) => (el.textContent = t.count));
  $("[data-bar-total]").textContent = price(t.total);
  $("[data-bag-bar]").hidden = empty;
  renderCartNotices();
}

$("[data-lines]").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.inc != null) { const l = cart[+b.dataset.inc]; l.qty = Math.min(MAX_QTY, l.qty + 1); }
  else if (b.dataset.dec != null) { const i = +b.dataset.dec; cart[i].qty -= 1; if (cart[i].qty < 1) cart.splice(i, 1); }
  else if (b.dataset.remove != null) cart.splice(+b.dataset.remove, 1);
  else return;
  commit();
});

/* ---------- Checkout ---------- */

const customer = load(CUSTOMER_KEY, {});
for (const k of ["name", "phone", "address"]) if (customer[k]) form.elements[k].value = customer[k];
if (customer.type === "Pickup") $("#type-pickup").checked = true;

function syncType() {
  $("[data-address-field]").hidden = orderType() !== "Delivery";
  renderCart();
}
form.addEventListener("change", (e) => { if (e.target.name === "type") syncType(); });
form.addEventListener("input", (e) => { const f = e.target.closest(".field"); if (f) f.classList.remove("bad"); });

function buildMessage(c, number, priced, t) {
  const s = content.settings;
  const out = [`*New order${number ? " " + number : ""} – ${s.shopName}*`, "", `*Name:* ${c.name}`, `*Phone:* ${c.phone}`, `*Order type:* ${c.type}`];
  if (c.type === "Delivery") out.push(`*Address:* ${c.address}`);
  out.push("");
  priced.forEach((p, i) => {
    out.push(`${i + 1}. ${p.qty} × ${p.name}${p.option ? " (" + p.option + ")" : ""}${p.choice ? " – " + p.choice : ""} — ${money(p.total)}`);
    if (p.extras.length) out.push("    + " + p.extras.map((x) => x.name).join(", "));
    if (p.note) out.push("    Note: " + p.note);
  });
  out.push("");
  if (t.fee) { out.push("Subtotal: " + money(t.sub)); out.push("Delivery: " + money(t.fee)); }
  out.push(`*Total: ${money(t.total)}*` + (usdOn() ? ` (≈ ${usd(t.total, s.usdRate)} at ${s.usdRate.toLocaleString("en-US")} L.L./$)` : ""));
  if (c.notes) { out.push(""); out.push("*Notes:* " + c.notes); }
  return out.join("\n");
}

async function postOrder(c) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch("/api/orders", {
      method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...c, lines: cart.map(({ itemId, option, choice, extras, note, qty }) => ({ itemId, option, choice, extras, note, qty })) })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, data };
    return { ok: false, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  } finally {
    clearTimeout(timer);
  }
}

function showError(msg) {
  const err = $("[data-form-error]");
  err.hidden = !msg;
  err.textContent = msg || "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const c = {
    type: orderType(),
    name: form.elements.name.value.trim(),
    phone: form.elements.phone.value.trim(),
    address: form.elements.address.value.trim(),
    notes: form.elements.notes.value.trim()
  };
  $$(".field", form).forEach((f) => f.classList.remove("bad"));
  const missing = [];
  const mark = (n) => form.elements[n].closest(".field").classList.add("bad");
  if (!c.name) { missing.push(T("errName")); mark("name"); }
  if (c.phone.replace(/\D/g, "").length < 7) { missing.push(T("errPhone")); mark("phone"); }
  if (c.type === "Delivery" && !c.address) { missing.push(T("errAddress")); mark("address"); }
  if (missing.length) {
    showError(T("errMissing", { list: missing.join(", ") }));
    const first = $(".field.bad input, .field.bad textarea", form);
    if (first) first.focus();
    return;
  }
  const priced = cart.map((l) => priceLine(index, l));
  if (priced.some((p) => !p.ok)) { showError(T("errSoldOut")); return; }
  showError("");
  save(CUSTOMER_KEY, { name: c.name, phone: c.phone, address: c.address, type: c.type });

  // Open the WhatsApp tab now, while we still have the tap, then point it at the message.
  let win = null;
  try { win = window.open("about:blank", "_blank"); } catch { win = null; }
  const sendBtn = $("[data-send]");
  sendBtn.disabled = true;
  $("[data-send-label]").textContent = T("sendPreparing");

  let number = "";
  let t = totals();
  let lines = priced;
  if (ordersEnabled) {
    const res = await postOrder(c);
    if (res.ok) {
      number = res.data.number;
      lines = res.data.lines.map((l) => ({ ok: true, ...l }));
      t = { sub: res.data.subtotal, fee: res.data.fee, total: res.data.total, count: t.count };
    } else if (res.status === 409 || res.status === 400) {
      if (win) win.close();
      sendBtn.disabled = false;
      $("[data-send-label]").textContent = T("sendButton");
      showError(res.data.error || T("errGeneric"));
      if (res.data.code === "unavailable" || res.data.code === "paused") {
        const fresh = await fetchContent();
        setContent(fresh.content);
        renderAll();
      }
      return;
    }
    // Network or server trouble: still send the order on WhatsApp, just without a number.
  }

  lastMessage = buildMessage(c, number, lines, t);
  const url = "https://wa.me/" + content.settings.whatsappNumber + "?text=" + encodeURIComponent(lastMessage);
  if (win) { try { win.opener = null; win.location.href = url; } catch { win = null; } }

  sendBtn.disabled = false;
  $("[data-send-label]").textContent = T("sendButton");
  $("[data-sent-link]").href = url;
  $("[data-sent-text]").value = lastMessage;
  $("[data-sent-number]").textContent = number ? T("sentNumber", { number }) : T("sentAlmost");
  $("[data-sent]").hidden = false;
  cart = [];
  form.elements.notes.value = "";
  commit();
  $("[data-ticket] .ticket-card").scrollTop = 0;
  if (!win) $("[data-sent-link]").focus();
});

$("[data-new-order]").addEventListener("click", () => { $("[data-sent]").hidden = true; renderCart(); });
$("[data-copy]").addEventListener("click", () => {
  const ta = $("[data-sent-text]");
  const fallback = () => { ta.focus(); ta.select(); toast(T("toastCopyFallback")); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lastMessage).then(() => toast(T("toastCopied")), fallback);
  else fallback();
});

/* ---------- Order sheet on phones ---------- */

const ticket = $("[data-ticket]");
const scrim = $("[data-scrim]");
const mq = window.matchMedia("(max-width: 1023px)");
function openOrder() {
  if (mq.matches) {
    ticket.classList.add("open");
    scrim.hidden = false;
    document.body.style.overflow = "hidden";
    $("[data-close-order]").focus();
  } else {
    ticket.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
function closeOrder() {
  ticket.classList.remove("open");
  scrim.hidden = true;
  document.body.style.overflow = "";
}
$$("[data-open-order]").forEach((b) => b.addEventListener("click", openOrder));
$("[data-close-order]").addEventListener("click", closeOrder);
scrim.addEventListener("click", closeOrder);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ticket.classList.contains("open")) closeOrder(); });
mq.addEventListener("change", () => { if (!mq.matches) closeOrder(); });

/* ---------- Leaving or reloading ----------
   When you reload, phones keep showing the old screen until the new page is ready. Jumping to the
   top as the reload starts means that leftover screen is already at the top, so nothing jumps. */
function toTopNow() {
  document.documentElement.style.scrollBehavior = "auto";
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
window.addEventListener("beforeunload", toTopNow);
window.addEventListener("pagehide", toTopNow);
window.addEventListener("pageshow", (e) => { if (e.persisted) document.documentElement.style.scrollBehavior = ""; });

/* ---------- In-page links ----------
   Links like "Start your order" scroll smoothly to their section without adding "#menu" to the
   address, so reopening or reloading the site starts at the top again. */
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  const id = a.getAttribute("href").slice(1);
  const target = id === "top" ? document.body : document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (id === "top") window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  else target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  if (a.classList.contains("skip")) {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }
});

/* ---------- Header & toast ---------- */

const head = $("[data-head]");
const onScroll = () => head.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

const toastEl = $("[data-toast]");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1900);
}

/* ---------- Boot ---------- */

function renderAll() {
  cart = cart.filter((l) => l && l.itemId && l.qty > 0 && index.items.has(l.itemId));
  // Each part draws on its own: if one ever fails, the rest of the page still shows.
  for (const step of [applyTheme, renderHeroMedia, renderCurrency, renderTexts, renderFavs, renderMenu, syncType, renderBadges]) {
    try { step(); } catch (e) { console.error("Crepe Beirut: " + step.name + " failed", e); }
  }
}

(async function boot() {
  const inline = document.getElementById("cb-data");
  if (inline) {
    try {
      const data = JSON.parse(inline.textContent);
      ordersEnabled = !!data.ordersEnabled;
      setContent(data.content);
      renderAll();
      return;
    } catch { /* fall through to the API */ }
  }
  const cached = load(CONTENT_CACHE, null);
  if (cached) { setContent(cached); renderAll(); }
  const res = await fetchContent();
  ordersEnabled = res.ordersEnabled;
  if (cached && JSON.stringify(res.content) === JSON.stringify(cached)) return;
  setContent(res.content);
  renderAll();
  try { renderOfflineNote(res.exportedAt); } catch (e) { console.error(e); }
})();
setInterval(() => { if (content) renderOpen(); }, 60000);

/* ---------- Motion ----------
   Sections and cards float in as they scroll into view, badges spin in like batter spread on the
   plate, a chocolate drizzle draws under headings, and the hero's spreader turns as you scroll.
   Nothing is hidden unless motion is allowed and the observer is available. */

const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window;
let revealIO = null;

function markReveals() {
  if (!motionOK) return;
  const add = (el, delay = 0, kind = "") => {
    if (!el || el.dataset.revealed) return;
    el.classList.add("reveal");
    if (kind) el.classList.add(kind);
    el.style.setProperty("--d", delay + "ms");
    el.dataset.revealed = "1";
    revealIO.observe(el);
  };
  $$(".drizzle").forEach((el) => add(el, 150, "draw"));
  $$(".section-head, .menu-intro, .about-copy > *, .visit-card, .seal").forEach((el) => add(el));
  $$(".fav").forEach((el, i) => add(el, (i % 4) * 90));
  $$(".cat").forEach((cat) => {
    add($(".cat-head h3", cat));
    add($(".cat-badge", cat), 0, "spin");
    $$(".item", cat).forEach((el, i) => add(el, Math.min(i, 8) * 45));
  });
}

if (motionOK) {
  document.documentElement.classList.add("motion");
  revealIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("shown");
      revealIO.unobserve(en.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  markReveals();
  new MutationObserver(markReveals).observe($("[data-menu]"), { childList: true });
  new MutationObserver(markReveals).observe($("[data-favs]"), { childList: true });

  // Hero parallax: the spreader turns and the crepe floats as you scroll.
  const art = $(".hero-art");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = Math.min(window.scrollY, 900);
      art.style.setProperty("--sy", y.toFixed(1));
      ticking = false;
    });
  }, { passive: true });
}

/** A little picture flies from the + button into the order bag. */
function flyToBag(fromRect, src) {
  if (!motionOK) return Promise.resolve();
  const targets = [$(".bag-bar"), $(".bag-btn")].filter((el) => el && el.offsetParent !== null && !el.hidden);
  const target = targets[0];
  if (!target) return Promise.resolve();
  const to = target.getBoundingClientRect();
  const dot = document.createElement("div");
  dot.className = "fly";
  if (src) dot.innerHTML = `<img src="${src}" alt="">`;
  document.body.appendChild(dot);
  const x0 = fromRect.left + fromRect.width / 2 - 22, y0 = fromRect.top + fromRect.height / 2 - 22;
  const x1 = to.left + to.width / 2 - 22, y1 = to.top + to.height / 2 - 22;
  const lift = Math.min(160, Math.abs(y1 - y0) * 0.4 + 60);
  const anim = dot.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(.6) rotate(0deg)`, opacity: 0 },
    { transform: `translate(${x0}px, ${y0 - 20}px) scale(1.1) rotate(-20deg)`, opacity: 1, offset: 0.15 },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(1) rotate(140deg)`, offset: 0.55 },
    { transform: `translate(${x1}px, ${y1}px) scale(.35) rotate(320deg)`, opacity: 0.9 }
  ], { duration: 780, easing: "cubic-bezier(.45,.05,.35,1)" });
  return anim.finished.catch(() => {}).then(() => dot.remove());
}

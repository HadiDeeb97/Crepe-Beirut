/*
 * Logic shared by the website, the admin panel and the server (Cloudflare Functions):
 * money formatting, pricing an order line, opening hours, and cleaning saved content.
 */

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
export const ORDER_STATUSES = ["new", "accepted", "completed", "cancelled"];
export const MAX_QTY = 50;
export const MAX_LINES = 60;

/* ---------- Theme ---------- */

export const THEME_PRESETS = {
  original:   { label: "Crepe Beirut",   brand: "#633C20", accent: "#BDD9EE", soft: "#FCF0CA", background: "#FFFBF1" },
  caramel:    { label: "Lotus caramel",  brand: "#7A451A", accent: "#F2C894", soft: "#F8E8C8", background: "#FFFAF2" },
  pistachio:  { label: "Pistachio",      brand: "#3E5A2B", accent: "#CFE3B5", soft: "#F4EFD6", background: "#FCFBF4" },
  strawberry: { label: "Strawberry",     brand: "#7A2B3A", accent: "#F6C9D2", soft: "#FBEBD8", background: "#FFF9F7" },
  blueberry:  { label: "Blueberry",      brand: "#2E3A6B", accent: "#C9D3F4", soft: "#F1ECF9", background: "#FBFAFF" }
};

// weight: the one weight each headline font is drawn in (some only come in one weight).
export const DISPLAY_FONTS = {
  "Fraunces": { label: "Fraunces (soft, classic)", css: "Fraunces:opsz,wght,SOFT@9..144,400..800,0..100", stack: '"Fraunces", Georgia, serif', weight: 700 },
  "DM Serif Display": { label: "DM Serif Display (elegant)", css: "DM+Serif+Display", stack: '"DM Serif Display", Georgia, serif', weight: 400 },
  "Gloock": { label: "Gloock (bold, retro)", css: "Gloock", stack: '"Gloock", Georgia, serif', weight: 400 },
  "Baloo 2": { label: "Baloo 2 (round, playful)", css: "Baloo+2:wght@700", stack: '"Baloo 2", system-ui, sans-serif', weight: 700 },
  "Lobster Two": { label: "Lobster Two (script)", css: "Lobster+Two:wght@700", stack: '"Lobster Two", Georgia, serif', weight: 700 }
};

export const BODY_FONTS = {
  "Figtree": { label: "Figtree (clean)", css: "Figtree:wght@400;700", stack: '"Figtree", system-ui, sans-serif' },
  "Nunito": { label: "Nunito (rounded)", css: "Nunito:wght@400;700", stack: '"Nunito", system-ui, sans-serif' },
  "DM Sans": { label: "DM Sans (neutral)", css: "DM+Sans:opsz,wght@9..40,400;9..40,700", stack: '"DM Sans", system-ui, sans-serif' },
  "Tajawal": { label: "Tajawal (works with Arabic)", css: "Tajawal:wght@400;700", stack: '"Tajawal", system-ui, sans-serif' }
};

export const DEFAULT_THEME = {
  preset: "original", ...THEME_PRESETS.original, displayFont: "Fraunces", bodyFont: "Figtree", corners: "soft", pattern: "stripes", mode: "light", allowToggle: true
};
delete DEFAULT_THEME.label;

// The row of facts in "About us". kind "items"/"extras" show a live count; "text" shows your own words.
export const DEFAULT_FACTS = [
  { kind: "items", value: "", label: "things on the menu" },
  { kind: "extras", value: "", label: "extras to pile on" },
  { kind: "text", value: "12 / 25", label: "mini pancakes a box" }
];

/** HTML for the About facts list (shared by the server render and the browser). */
export function factsHtml(content) {
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const items = (content.categories || []).filter((c) => c.visible).reduce((n, c) => n + c.items.length, 0);
  const extras = (content.extras || []).reduce((n, g) => n + g.items.length, 0);
  return (content.facts || DEFAULT_FACTS).map((f) => {
    const value = f.kind === "items" ? items : f.kind === "extras" ? extras : f.value;
    if (!String(value).trim() && !f.label.trim()) return "";
    return `<li><b>${esc(value)}</b><span>${esc(f.label)}</span></li>`;
  }).join("");
}

// heroShape: "rounded" (framed photo), "circle", or "none" (no frame, e.g. a cut-out logo); heroZoom in %.
export const DEFAULT_MEDIA = { hero: "", heroDrawings: true, heroShape: "rounded", heroZoom: 100, about: "" };

/** URL of an uploaded image (its id is the SHA-256 of the file). size "small" = the thumbnail copy. */
export function imageUrl(id, size) {
  return id ? "/api/images/" + id + (size === "small" ? "s" : "") : "";
}
export const isImageId = (v) => /^[a-f0-9]{64}$/.test(v || "");

/** Every uploaded image id the content uses (items, sections, home and About pictures). */
export function imageIdsIn(content) {
  const ids = new Set();
  const add = (v) => { if (isImageId(v)) ids.add(v); };
  for (const c of content.categories || []) {
    add(c.image);
    for (const it of c.items || []) add(it.image);
  }
  add(content.media && content.media.hero);
  add(content.media && content.media.about);
  return ids;
}

/** Relative luminance contrast between two #rrggbb colours (1–21). */
export function contrast(a, b) {
  const lum = (hex) => {
    const n = parseInt(String(hex).slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** "$3.91" for an amount in L.L. at `rate` L.L. per dollar. */
export function usd(lbp, rate) {
  const v = (Number(lbp) || 0) / rate;
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money(n) {
  return Math.round(Number(n) || 0).toLocaleString("en-US") + " L.L.";
}

export function slug(s) {
  return String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

export function orderNumber(id) {
  return "CB-" + (1000 + Number(id));
}

/* ---------- Menu index & pricing ---------- */

export function indexContent(content) {
  const items = new Map();
  const extras = new Map();
  for (const cat of content.categories || []) {
    for (const it of cat.items || []) items.set(it.id, { item: it, cat });
  }
  const extraGroup = new Map();
  for (const g of content.extras || []) {
    for (const x of g.items || []) { extras.set(x.id, x); extraGroup.set(x.id, g); }
  }
  return { items, extras, extraGroup };
}

/** Extra groups offered on a menu section, in admin order. */
export function extraGroupsFor(content, catId) {
  return (content.extras || []).filter((g) => (g.sections || []).includes(catId) && g.items.length);
}

export function itemBasePrice(item, optionLabel) {
  if (item.options && item.options.length) {
    const o = item.options.find((o) => o.label === optionLabel) || item.options[0];
    return o.price;
  }
  return item.price || 0;
}

export function minPrice(item) {
  if (item.options && item.options.length) return Math.min(...item.options.map((o) => o.price));
  return item.price || 0;
}

/**
 * Price one cart line against the current menu.
 * Returns { ok: true, ...details } or { ok: false, reason, name }.
 */
export function priceLine(index, line) {
  const hit = index.items.get(line && line.itemId);
  if (!hit) return { ok: false, reason: "missing", name: (line && line.name) || "An item" };
  const { item, cat } = hit;
  if (!cat.visible || !item.available) return { ok: false, reason: "unavailable", name: item.name };
  const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(line.qty) || 1)));

  let option = "";
  if (item.options && item.options.length) {
    const o = item.options.find((o) => o.label === line.option) || item.options[0];
    option = o.label;
  }
  let choice = "";
  if (cat.choice && cat.choice.values && cat.choice.values.length) {
    choice = cat.choice.values.includes(line.choice) ? line.choice : cat.choice.values[0];
  }
  const extras = [];
  if (Array.isArray(line.extras)) {
    const picked = new Map();
    for (const id of line.extras) {
      const x = index.extras.get(id);
      const g = index.extraGroup.get(id);
      // Only extras whose group is offered on this item's section count.
      if (!x || !g || !(g.sections || []).includes(cat.id)) continue;
      if (!x.available) return { ok: false, reason: "unavailable", name: x.name + " (extra)" };
      if (extras.find((e) => e.id === x.id)) continue;
      const n = picked.get(g.id) || 0;
      if (g.max && n >= g.max) continue;
      picked.set(g.id, n + 1);
      extras.push({ id: x.id, name: x.name, price: x.price });
    }
  }
  const note = String(line.note || "").slice(0, 140).trim();
  const unit = itemBasePrice(item, option) + extras.reduce((s, x) => s + x.price, 0);
  return { ok: true, itemId: item.id, name: item.name, category: cat.name, option, choice, extras, note, qty, unit, total: unit * qty };
}

/* ---------- Opening hours ---------- */

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatTime(hhmm) {
  const t = toMinutes(hhmm);
  if (t === null) return "";
  let h = Math.floor(t / 60) % 24;
  const m = t % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + (m ? ":" + String(m).padStart(2, "0") : "") + " " + ap;
}

export function hoursConfigured(settings) {
  return (settings.hours || []).some((h) => h.closed || (toMinutes(h.open) !== null && toMinutes(h.close) !== null));
}

/** Day key and minutes-since-midnight for `date` in the shop's time zone. */
export function shopClock(settings, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timezone || "Asia/Beirut", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  const day = get("weekday").slice(0, 3).toLowerCase();
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * { configured, open, label } where label reads like "Open now · until 1 AM" or "Closed · opens 12 PM".
 */
export function openState(settings, date = new Date()) {
  if (!hoursConfigured(settings)) return { configured: false, open: null, label: "" };
  const byDay = Object.fromEntries((settings.hours || []).map((h) => [h.day, h]));
  const { day, minutes } = shopClock(settings, date);
  const di = DAYS.indexOf(day);
  const today = byDay[day];
  const yesterday = byDay[DAYS[(di + 6) % 7]];

  const span = (h) => {
    if (!h || h.closed) return null;
    const o = toMinutes(h.open), c = toMinutes(h.close);
    if (o === null || c === null) return null;
    return { o, c: c <= o ? c + 1440 : c, close: h.close };
  };
  const y = span(yesterday);
  if (y && y.c > 1440 && minutes < y.c - 1440) return { configured: true, open: true, label: "Open now · until " + formatTime(y.close) };
  const t = span(today);
  if (t && minutes >= t.o && minutes < t.c) return { configured: true, open: true, label: "Open now · until " + formatTime(t.close) };
  if (t && minutes < t.o) return { configured: true, open: false, label: "Closed · opens " + formatTime(today.open) };
  for (let k = 1; k <= 7; k++) {
    const d = DAYS[(di + k) % 7];
    const s = span(byDay[d]);
    if (s) return { configured: true, open: false, label: "Closed · opens " + (k === 1 ? "tomorrow " : DAY_NAMES[d] + " ") + formatTime(byDay[d].open) };
  }
  return { configured: true, open: false, label: "Closed" };
}

/* ---------- Phone numbers ---------- */

/** Turn a Lebanese local number (e.g. "70 123 456" or "03 123 456") into WhatsApp digits. */
export function waDigits(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("961")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return d.length >= 7 && d.length <= 8 ? "961" + d : d;
}

/* ---------- Cleaning content saved from the admin panel ---------- */

const str = (v, max = 200) => String(v == null ? "" : v).slice(0, max);
const num = (v) => {
  const n = Math.round(Number(String(v).replace(/[^\d.]/g, "")));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1e10) : 0;
};
const bool = (v, d = false) => (typeof v === "boolean" ? v : d);
const hhmm = (v) => (/^\d{1,2}:\d{2}$/.test(v || "") ? v : "");

function uniqueId(base, used) {
  let id = base, n = 2;
  while (used.has(id)) id = base + "-" + n++;
  used.add(id);
  return id;
}

/**
 * Return a well-formed copy of `raw`, filling gaps from `defaults`.
 * Throws an Error with a readable message if the shape is unusable.
 */
export function normalizeContent(raw, defaults) {
  if (!raw || typeof raw !== "object") throw new Error("Content is empty.");
  const ds = defaults.settings, dt = defaults.texts;
  const s = raw.settings || {};
  const hoursIn = Array.isArray(s.hours) ? s.hours : ds.hours;
  const settings = {
    shopName: str(s.shopName || ds.shopName, 60),
    whatsappNumber: str(s.whatsappNumber, 20).replace(/\D/g, "") || ds.whatsappNumber,
    whatsappDisplay: str(s.whatsappDisplay, 30) || ds.whatsappDisplay,
    address: str(s.address, 200),
    mapsUrl: /^https:\/\//.test(s.mapsUrl || "") ? str(s.mapsUrl, 500) : "",
    instagram: /^https:\/\//.test(s.instagram || "") ? str(s.instagram, 300) : "",
    facebook: /^https:\/\//.test(s.facebook || "") ? str(s.facebook, 300) : "",
    tiktok: /^https:\/\//.test(s.tiktok || "") ? str(s.tiktok, 300) : "",
    deliveryFee: num(s.deliveryFee),
    usdRate: num(s.usdRate),
    // US dollar prices: shown only when switched on and a rate is set.
    showUsd: bool(s.showUsd, false),
    defaultCurrency: s.defaultCurrency === "usd" ? "usd" : "lbp",
    orderingOpen: bool(s.orderingOpen, true),
    pausedMessage: str(s.pausedMessage, 240) || ds.pausedMessage,
    timezone: str(s.timezone || ds.timezone, 60),
    hours: DAYS.map((d) => {
      const h = hoursIn.find((x) => x && x.day === d) || {};
      return { day: d, open: hhmm(h.open), close: hhmm(h.close), closed: bool(h.closed) };
    })
  };
  const t = raw.texts || {};
  const texts = {};
  for (const k of Object.keys(dt)) texts[k] = str(t[k] == null ? dt[k] : t[k], k.endsWith("Text") ? 2000 : 240);

  if (!Array.isArray(raw.categories) || !raw.categories.length) throw new Error("The menu needs at least one section.");
  const catIds = new Set(), itemIds = new Set();
  const categories = raw.categories.slice(0, 60).map((c) => {
    const name = str(c.name, 60).trim() || "Untitled section";
    const id = uniqueId(slug(c.id || name), catIds);
    const values = c.choice && Array.isArray(c.choice.values) ? c.choice.values.map((v) => str(v, 30).trim()).filter(Boolean).slice(0, 6) : [];
    return {
      id, name,
      img: /^[a-z0-9-]{1,40}$/.test(c.img || "") ? c.img : "badge",
      image: isImageId(c.image) ? c.image : "",
      blurb: str(c.blurb, 160),
      extras: bool(c.extras),
      choice: values.length ? { label: str(c.choice.label, 40) || "Choose", values } : null,
      visible: bool(c.visible, true),
      items: (Array.isArray(c.items) ? c.items : []).slice(0, 200).map((it) => {
        const iname = str(it.name, 80).trim() || "Untitled item";
        const options = (Array.isArray(it.options) ? it.options : [])
          .map((o) => ({ label: str(o.label, 30).trim(), price: num(o.price) }))
          .filter((o) => o.label).slice(0, 8);
        return {
          id: uniqueId(it.id ? str(it.id, 120) : id + "/" + slug(iname), itemIds),
          name: iname,
          desc: str(it.desc, 200),
          price: options.length ? null : num(it.price),
          options,
          available: bool(it.available, true),
          featured: bool(it.featured),
          image: isImageId(it.image) ? it.image : ""
        };
      })
    };
  });
  const groupIds = new Set(), extraIds = new Set();
  const extras = (Array.isArray(raw.extras) ? raw.extras : []).slice(0, 20).map((g) => {
    const name = str(g.name, 50).trim() || "Extras";
    // Which menu sections offer this group. Older content had one on/off switch per section,
    // so without a list, the group goes on every section that had extras switched on.
    const sections = Array.isArray(g.sections)
      ? [...new Set(g.sections.map(String))].filter((id) => catIds.has(id))
      : categories.filter((c) => c.extras).map((c) => c.id);
    const max = Math.max(0, Math.min(20, Math.floor(Number(g.max) || 0)));
    return {
      id: uniqueId(slug(g.id || name), groupIds),
      name,
      sections,
      max,
      items: (Array.isArray(g.items) ? g.items : []).slice(0, 80).map((x) => {
        const xname = str(x.name, 60).trim() || "Extra";
        return { id: uniqueId(slug(x.id || xname), extraIds), name: xname, price: num(x.price), available: bool(x.available, true) };
      })
    };
  });
  for (const c of categories) c.extras = extras.some((g) => g.sections.includes(c.id) && g.items.length);
  const th = raw.theme || {};
  const hex = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v || "") ? v.toUpperCase() : d);
  const theme = {
    preset: THEME_PRESETS[th.preset] ? th.preset : "custom",
    brand: hex(th.brand, DEFAULT_THEME.brand),
    accent: hex(th.accent, DEFAULT_THEME.accent),
    soft: hex(th.soft, DEFAULT_THEME.soft),
    background: hex(th.background, DEFAULT_THEME.background),
    displayFont: DISPLAY_FONTS[th.displayFont] ? th.displayFont : DEFAULT_THEME.displayFont,
    bodyFont: BODY_FONTS[th.bodyFont] ? th.bodyFont : DEFAULT_THEME.bodyFont,
    corners: ["soft", "round", "square"].includes(th.corners) ? th.corners : DEFAULT_THEME.corners,
    pattern: ["stripes", "grid", "plain"].includes(th.pattern) ? th.pattern : DEFAULT_THEME.pattern,
    mode: ["light", "auto", "dark"].includes(th.mode) ? th.mode : DEFAULT_THEME.mode,
    allowToggle: bool(th.allowToggle, true)
  };
  if (!raw.theme) theme.preset = DEFAULT_THEME.preset;
  const m = raw.media || {};
  const media = {
    hero: isImageId(m.hero) ? m.hero : "",
    heroDrawings: bool(m.heroDrawings, true),
    heroShape: ["rounded", "circle", "none"].includes(m.heroShape) ? m.heroShape : "rounded",
    heroZoom: Math.max(100, Math.min(250, Math.round(Number(m.heroZoom) || 100))),
    about: isImageId(m.about) ? m.about : ""
  };
  const facts = (Array.isArray(raw.facts) ? raw.facts : DEFAULT_FACTS).slice(0, 4).map((f) => ({
    kind: ["items", "extras", "text"].includes(f && f.kind) ? f.kind : "text",
    value: str(f && f.value, 24),
    label: str(f && f.label, 40)
  }));
  return { version: 1, settings, texts, theme, media, facts, categories, extras };
}

/* ---------- Dates in the shop's time zone ---------- */

function tzOffsetMs(timeZone, date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(date).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Midnight at the start of the shop's day, `daysAgo` days back, as a Date. */
export function startOfShopDay(timeZone = "Asia/Beirut", daysAgo = 0, now = new Date()) {
  const off = tzOffsetMs(timeZone, now);
  const local = new Date(now.getTime() + off);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - daysAgo);
  return new Date(local.getTime() - off);
}

import { money, orderNumber, waDigits, startOfShopDay, DAYS, DAY_NAMES, slug, imageUrl, THEME_PRESETS, DISPLAY_FONTS, BODY_FONTS, DEFAULT_THEME, DEFAULT_MEDIA, contrast } from "../js/shared.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clone = (o) => JSON.parse(JSON.stringify(o));
const ico = (id, cls = "ico") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"></use></svg>`;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
};
const PICTURES = ["crepe", "pancakes", "waffle", "spreader", "iced-cup", "shake", "latte", "smoothies", "leaf", "mojito", "tiramisu", "badge"];
/* ---------- Picture uploads ---------- */

// Longest side in pixels after shrinking, per use.
const MAX_SIDE = { item: 1000, section: 600, hero: 1600, about: 900 };

function pickFile() {
  return new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

async function shrink(file, maxSide) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    src = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("That file couldn't be opened as a picture."));
      img.src = URL.createObjectURL(file);
    });
  }
  const k = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * k));
  c.height = Math.max(1, Math.round(src.height * k));
  const g = c.getContext("2d");
  const toBlob = (type, q) => new Promise((r) => c.toBlob(r, type, q));
  g.drawImage(src, 0, 0, c.width, c.height);
  let blob = await toBlob("image/webp", 0.84);
  if (!blob || blob.type !== "image/webp") {
    g.globalCompositeOperation = "destination-over";
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    blob = await toBlob("image/jpeg", 0.85);
  }
  return blob;
}

/** Ask for a picture, shrink it, upload it. Resolves to the image id, or null. */
async function uploadImage(kind) {
  const file = await pickFile();
  if (!file) return null;
  if (!file.type.startsWith("image/")) { toast("Choose a picture file (JPG, PNG or WebP).", true); return null; }
  toast("Uploading picture…");
  try {
    const blob = await shrink(file, MAX_SIDE[kind] || 1200);
    const r = await fetch("/api/admin/images", { method: "POST", body: blob, headers: { "content-type": blob.type }, credentials: "same-origin" });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { showView("login"); return null; }
    if (!r.ok) { toast(data.error || "The picture couldn't be uploaded.", true); return null; }
    toast("Picture added. Publish to show it on the website.");
    return data.id;
  } catch (e) {
    toast(e.message || "The picture couldn't be uploaded.", true);
    return null;
  }
}

const fontLinks = new Set();
function useFont(spec) {
  if (!spec || fontLinks.has(spec.css)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=" + spec.css + "&display=swap";
  document.head.appendChild(l);
  fontLinks.add(spec.css);
}

const STATUS_LABEL = { new: "New", accepted: "Accepted", completed: "Completed", cancelled: "Cancelled" };

/* ---------- API ---------- */

async function api(path, opts = {}) {
  const r = await fetch("/api/admin/" + path, {
    method: opts.method || "GET",
    headers: opts.body ? { "content-type": "application/json" } : {},
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin"
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && path !== "login") { showView("login"); throw Object.assign(new Error(data.error || "Please sign in again."), { status: 401 }); }
  if (!r.ok) throw Object.assign(new Error(data.error || "Something went wrong (" + r.status + ")."), { status: r.status, data });
  return data;
}

/* ---------- Views & routing ---------- */

function showView(name) {
  $$("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== name));
  if (name === "login") setTimeout(() => $("#login-password").focus(), 30);
}

const state = {
  published: null,   // last published content
  draft: null,       // content being edited
  baseUpdatedAt: null,
  route: "orders",
  menuCat: 0,
  orders: { status: "all", range: "today", q: "", list: [], byStatus: null, summary: null, newestId: null, selected: null, fetchedAt: 0, error: "" }
};
const main = $("[data-main]");
const tz = () => (state.draft ? state.draft.settings.timezone : "Asia/Beirut") || "Asia/Beirut";
const isDirty = () => state.draft && JSON.stringify(state.draft) !== JSON.stringify(state.published);

function route() {
  const r = (location.hash || "#orders").slice(1);
  state.route = ["orders", "menu", "extras", "texts", "theme", "settings"].includes(r) ? r : "orders";
  $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === state.route));
  render();
  main.scrollTop = 0;
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);

function render() {
  const keep = window.scrollY;
  ({ orders: renderOrders, menu: renderMenu, extras: renderExtras, texts: renderTexts, theme: renderTheme, settings: renderSettings })[state.route]();
  updatePublishBar();
  return keep;
}
function rerender() { const y = window.scrollY; render(); window.scrollTo(0, y); }

function mobileTop() {
  return `<div class="mobile-top"><svg class="mark" aria-hidden="true"><use href="#cb-mark"></use></svg><span class="grow"></span>
    <a class="btn btn-ghost btn-sm" href="../" target="_blank" rel="noopener">${ico("i-eye")}Website</a>
    <button class="btn btn-ghost btn-sm" type="button" data-logout>${ico("i-out")}Sign out</button></div>`;
}

/* ---------- Toast ---------- */

const toastEl = $("[data-toast]");
let toastTimer;
function toast(msg, err = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle("err", err);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), err ? 4200 : 2400);
}

/* ---------- Formatting ---------- */

const fmtTime = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: tz(), hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const fmtDay = (iso) => new Intl.DateTimeFormat("en-GB", { timeZone: tz(), weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
function ago(iso) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  return fmtDay(iso);
}
const parseMoney = (v) => Number(String(v).replace(/[^\d]/g, "")) || 0;
const fmtMoneyInput = (n) => (n ? Number(n).toLocaleString("en-US") : "0");

/* ====================================================================
   ORDERS
   ==================================================================== */

function sinceFor(range) {
  if (range === "today") return startOfShopDay(tz(), 0).toISOString();
  if (range === "7") return startOfShopDay(tz(), 6).toISOString();
  if (range === "30") return startOfShopDay(tz(), 29).toISOString();
  return "";
}

let pollTimer = null;
let soundOn = store.get("cb-admin-sound", false);
let audioCtx = null;

function chime() {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    const t = audioCtx.currentTime;
    [880, 1318.5].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, t + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.4);
    });
  } catch { /* audio not available */ }
}

const freshIds = new Set();
async function loadOrders({ quiet = false } = {}) {
  const o = state.orders;
  const params = new URLSearchParams();
  if (o.status !== "all") params.set("status", o.status);
  const since = sinceFor(o.range);
  if (since) params.set("since", since);
  if (o.q) params.set("q", o.q);
  try {
    const data = await api("orders?" + params);
    const prevNewest = o.newestId;
    o.list = data.orders;
    o.byStatus = data.byStatus;
    o.summary = data.summary;
    o.newestId = data.newestId;
    o.fetchedAt = Date.now();
    o.error = "";
    if (prevNewest != null && data.newestId > prevNewest) {
      for (const x of data.orders) if (x.id > prevNewest) freshIds.add(x.id);
      const n = data.newestId - prevNewest;
      toast(n === 1 ? "New order " + orderNumber(data.newestId) : n + " new orders");
      chime();
    }
    if (o.selected) {
      const fresh = data.orders.find((x) => x.id === o.selected.id);
      if (fresh) o.selected = fresh;
    }
  } catch (e) {
    if (e.status === 401) return;
    o.error = e.message;
    if (!quiet) toast(e.message, true);
  }
  updateWaitingBadge();
  if (state.route === "orders") paintOrders();
}

function updateWaitingBadge() {
  const n = state.orders.summary ? state.orders.summary.waiting : 0;
  const b = $("[data-new-badge]");
  b.hidden = !n;
  b.textContent = n;
  document.title = (n ? "(" + n + ") " : "") + "Crepe Beirut Admin";
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (!document.hidden) loadOrders({ quiet: true }); }, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadOrders({ quiet: true }); });
}

function renderOrders() {
  main.innerHTML = mobileTop() + `
    <div class="page-head">
      <h1>Orders</h1>
      <span class="live" data-live><i></i><span data-live-text>Live</span></span>
      <button class="icon-btn ${soundOn ? "on" : ""}" type="button" data-sound aria-pressed="${soundOn}" title="${soundOn ? "Sound on for new orders" : "Sound off"}">${ico("i-bell")}</button>
      <button class="btn btn-line btn-sm" type="button" data-refresh>Refresh</button>
    </div>
    <div class="kpis" data-kpis></div>
    <div class="toolbar">
      <div class="tabs" role="tablist" data-status-tabs></div>
      <select data-range aria-label="Time range">
        <option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option>
      </select>
      <label class="search">${ico("i-search")}<span class="sr">Search orders</span><input type="search" data-order-q placeholder="Name, phone or CB-number" value="${esc(state.orders.q)}"></label>
    </div>
    <div class="orders" data-orders>
      <div class="card order-list" data-order-list></div>
      <div class="card detail" data-detail></div>
    </div>`;
  $("[data-range]").value = state.orders.range;
  paintOrders();
  if (!state.orders.fetchedAt) loadOrders();
}

function paintOrders() {
  const o = state.orders;
  const kp = $("[data-kpis]");
  if (!kp) return;
  const s = o.summary;
  kp.innerHTML = s ? `
    <div class="card kpi ${s.waiting ? "attn" : ""}"><span>Waiting for you</span><b>${s.waiting}</b><small>${s.waiting ? "New orders to accept" : "All caught up"}</small></div>
    <div class="card kpi"><span>Orders today</span><b>${s.today.count}</b><small>Not counting cancelled</small></div>
    <div class="card kpi"><span>Sales today</span><b>${money(s.today.sales).replace(" L.L.", "")}</b><small>L.L.</small></div>
    <div class="card kpi"><span>Sales, last 7 days</span><b>${money(s.week.sales).replace(" L.L.", "")}</b><small>L.L. · ${s.week.count} orders</small></div>`
    : `<div class="card kpi"><span>Loading…</span><b>–</b></div>`;

  const bs = o.byStatus || {};
  const total = Object.values(bs).reduce((n, x) => n + x.count, 0);
  $("[data-status-tabs]").innerHTML = [["all", "All", total], ["new", "New"], ["accepted", "Accepted"], ["completed", "Completed"], ["cancelled", "Cancelled"]]
    .map(([k, label, n]) => `<button type="button" role="tab" aria-selected="${o.status === k}" class="${o.status === k ? "on" : ""}" data-status-tab="${k}">${label}<span class="n">${n != null ? n : bs[k] ? bs[k].count : 0}</span></button>`).join("");

  const live = $("[data-live]");
  live.classList.toggle("off", !!o.error);
  $("[data-live-text]").textContent = o.error ? "Not updating" : "Live · updates every 20 s";

  const list = $("[data-order-list]");
  if (!o.fetchedAt && !o.error) list.innerHTML = `<div class="list-empty">Loading orders…</div>`;
  else if (!o.list.length) {
    list.innerHTML = `<div class="list-empty">${ico("i-orders")}<b>No orders here</b><span>${o.q ? "Nothing matches your search." : o.range === "today" ? "Orders placed on the website today will appear here." : "Try a longer time range."}</span></div>`;
  } else {
    list.innerHTML = "<ul>" + o.list.map((x) => `<li><button type="button" class="orow ${o.selected && o.selected.id === x.id ? "on" : ""} ${freshIds.has(x.id) ? "fresh" : ""}" data-status="${x.status}" data-order="${x.id}">
        <span class="orow-top"><span class="orow-num">${orderNumber(x.id)}</span><span class="orow-name">${esc(x.name)}</span></span>
        <span class="orow-total">${money(x.total)}</span>
        <span class="orow-meta"><span>${o.range === "today" ? fmtTime(x.createdAt) : fmtDay(x.createdAt) + " " + fmtTime(x.createdAt)}</span><span>·</span>
          <span class="type-tag">${ico(x.type === "Pickup" ? "i-bag" : "i-scooter")}${x.type}</span><span>·</span><span>${x.itemCount} ${x.itemCount === 1 ? "item" : "items"}</span></span>
        <span class="orow-side"><span class="pill" data-status="${x.status}">${STATUS_LABEL[x.status]}</span></span>
      </button></li>`).join("") + "</ul>" + (o.list.length >= 200 ? `<p class="list-more">Showing the latest 200. Narrow the range or search to see older orders.</p>` : "");
    freshIds.clear();
  }
  paintDetail();
}

function paintDetail() {
  const box = $("[data-detail]");
  if (!box) return;
  const x = state.orders.selected;
  $("[data-orders]").classList.toggle("show-detail", !!x);
  if (!x) {
    box.innerHTML = `<div class="detail-empty">${ico("i-orders")}<b>Pick an order</b><span>Its items, customer details and actions show here.</span></div>`;
    return;
  }
  const num = orderNumber(x.id);
  const digits = waDigits(x.phone);
  const firstName = x.name.split(/\s+/)[0];
  const waText = x.status === "accepted" || x.status === "new"
    ? `Hi ${firstName}, this is Crepe Beirut. Your order ${num} (${money(x.total)}) is confirmed${x.type === "Pickup" ? " and will be ready for pickup soon" : " and on its way soon"}. Thank you!`
    : `Hi ${firstName}, this is Crepe Beirut about your order ${num}.`;
  const actions = {
    new: `<button class="btn btn-brand" type="button" data-set-status="accepted">${ico("i-check")}Accept order</button><button class="btn btn-ghost" type="button" data-cancel>Cancel order</button>`,
    accepted: `<button class="btn btn-brand" type="button" data-set-status="completed">${ico("i-check")}Mark as completed</button><button class="btn btn-ghost" type="button" data-cancel>Cancel order</button>`,
    completed: `<button class="btn btn-line" type="button" data-set-status="accepted">Reopen</button>`,
    cancelled: `<button class="btn btn-line" type="button" data-set-status="new">Restore order</button>`
  }[x.status];

  box.innerHTML = `
    <div class="detail-head">
      <button class="icon-btn detail-back" type="button" data-close-detail aria-label="Back to orders">${ico("i-x")}</button>
      <div class="grow">
        <h2>${num}</h2>
        <p class="muted">${fmtDay(x.createdAt)} at ${fmtTime(x.createdAt)} · ${ago(x.createdAt)}</p>
      </div>
      <span class="pill" data-status="${x.status}">${STATUS_LABEL[x.status]}</span>
    </div>
    <div class="detail-body">
      <div class="dsec">
        <h3>Customer</h3>
        <div class="cust">
          <b>${esc(x.name)}</b>
          <span class="num">${esc(x.phone)}</span>
          <span class="type-tag muted">${ico(x.type === "Pickup" ? "i-bag" : "i-scooter")}${x.type}${x.address ? " · " + esc(x.address) : ""}</span>
        </div>
        <div class="cust-actions">
          <a class="btn btn-wa btn-sm" href="https://wa.me/${digits}?text=${encodeURIComponent(waText)}" target="_blank" rel="noopener">${ico("i-wa")}WhatsApp</a>
          <a class="btn btn-line btn-sm" href="tel:+${digits}">${ico("i-phone")}Call</a>
          ${x.address ? `<a class="btn btn-line btn-sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.address + ", Lebanon")}" target="_blank" rel="noopener">${ico("i-pin")}Map</a>` : ""}
        </div>
      </div>
      <div class="dsec">
        <h3>${x.itemCount} ${x.itemCount === 1 ? "item" : "items"}</h3>
        <ul class="ditems">${x.lines.map((l) => `<li>
          <span class="q">${l.qty}×</span>
          <span class="nm">${esc(l.name)}</span>
          <span class="pr">${money(l.total)}</span>
          ${[l.option, l.choice, l.extras && l.extras.length ? "+ " + l.extras.map((e) => e.name).join(", ") : "", l.note ? "“" + l.note + "”" : ""].filter(Boolean).length
            ? `<span class="sub">${esc([l.option, l.choice, l.extras && l.extras.length ? "+ " + l.extras.map((e) => e.name).join(", ") : "", l.note ? "“" + l.note + "”" : ""].filter(Boolean).join(" · "))}</span>` : ""}
        </li>`).join("")}</ul>
        <div class="dtotals">
          ${x.fee ? `<div><span>Subtotal</span><span>${money(x.subtotal)}</span></div><div><span>Delivery</span><span>${money(x.fee)}</span></div>` : ""}
          <div class="big"><span>Total</span><span>${money(x.total)}</span></div>
        </div>
      </div>
      ${x.notes ? `<div class="dsec"><h3>Customer note</h3><p class="note-box">${esc(x.notes)}</p></div>` : ""}
      <div class="dsec">
        <h3><label for="staff-note">Staff note</label></h3>
        <textarea class="input" id="staff-note" data-staff-note rows="2" placeholder="Only staff see this, e.g. paid cash, driver Ali">${esc(x.staffNote)}</textarea>
      </div>
      <div class="detail-actions" data-actions>${actions}</div>
    </div>`;
}

async function setStatus(status) {
  const x = state.orders.selected;
  if (!x) return;
  try {
    const { order } = await api("orders/" + x.id, { method: "PATCH", body: { status } });
    state.orders.selected = order;
    const i = state.orders.list.findIndex((o) => o.id === order.id);
    if (i >= 0) state.orders.list[i] = order;
    toast(orderNumber(order.id) + " is now " + STATUS_LABEL[status].toLowerCase());
    paintOrders();
    loadOrders({ quiet: true });
  } catch (e) { if (e.status !== 401) toast(e.message, true); }
}

/* ====================================================================
   CONTENT EDITING (menu, extras, texts, settings)
   ==================================================================== */

function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, val) {
  const ks = path.split(".");
  const last = ks.pop();
  const target = ks.reduce((o, k) => o[k], obj);
  target[last] = val;
}

function updatePublishBar() {
  $("[data-publish-bar]").hidden = !(isDirty() && state.route !== "orders");
}

// Inputs carry data-bind="path" and data-kind="text|money|bool|time".
main.addEventListener("input", (e) => {
  const el = e.target.closest("[data-bind]");
  if (!el || !state.draft) return;
  const kind = el.dataset.kind || "text";
  let v = el.value;
  if (kind === "money") v = parseMoney(v);
  if (kind === "bool") v = el.checked;
  if (kind === "digits") v = v.replace(/\D/g, "");
  setPath(state.draft, el.dataset.bind, v);
  if (el.dataset.refresh) rerender();
  updatePublishBar();
});
main.addEventListener("change", (e) => {
  const el = e.target.closest("[data-bind]");
  if (el && el.dataset.kind === "money") el.value = fmtMoneyInput(parseMoney(el.value));
  if (el && el.tagName === "SELECT") { setPath(state.draft, el.dataset.bind, el.value); rerender(); }
  if (el && (el.type === "checkbox" || el.type === "radio")) {
    if (el.dataset.kind === "bool") setPath(state.draft, el.dataset.bind, el.checked);
    else setPath(state.draft, el.dataset.bind, el.value);
    if (el.dataset.alsoClear) setPath(state.draft, el.dataset.alsoClear, "");
    if (el.dataset.bind === "theme.mode") previewPick = null;
    if (el.dataset.refresh !== "no") rerender();
  }
  updatePublishBar();
});

const field = (label, path, opts = {}) => {
  const v = getPath(state.draft, path);
  const id = "f-" + path.replace(/\./g, "-");
  const help = opts.help ? `<p class="help">${opts.help}</p>` : "";
  if (opts.textarea) return `<div class="field"><label for="${id}">${label}</label><textarea id="${id}" data-bind="${path}" rows="${opts.rows || 3}" placeholder="${esc(opts.placeholder || "")}">${esc(v)}</textarea>${help}</div>`;
  if (opts.money) return `<div class="field"><label for="${id}">${label}</label><div class="input-wrap"><input id="${id}" class="input money${(opts.suffix || "").length > 5 ? " wide" : ""}" inputmode="numeric" data-bind="${path}" data-kind="money" value="${fmtMoneyInput(v)}"><span class="suffix">${opts.suffix || "L.L."}</span></div>${help}</div>`;
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" ${opts.type ? `type="${opts.type}"` : ""} data-bind="${path}" ${opts.digits ? 'data-kind="digits" inputmode="numeric"' : ""} value="${esc(v)}" placeholder="${esc(opts.placeholder || "")}" maxlength="${opts.max || 240}">${help}</div>`;
};
const sw = (label, path, opts = {}) => `<label class="switch"><input type="checkbox" data-bind="${path}" data-kind="bool" ${getPath(state.draft, path) ? "checked" : ""} ${opts.norefresh ? 'data-refresh="no"' : ""}><span class="track"></span>${label}</label>`;
const thumb = (img, size = "") => `<span class="thumb" ${size ? `style="width:${size}px;height:${size}px"` : ""}>${img && img !== "badge" ? `<img src="../assets/img/${img}.webp" alt="">` : `<svg aria-hidden="true"><use href="#cb-mark"></use></svg>`}</span>`;
const uid = (p) => p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* ---------- Menu ---------- */

function renderMenu() {
  const cats = state.draft.categories;
  if (state.menuCat >= cats.length) state.menuCat = Math.max(0, cats.length - 1);
  const ci = state.menuCat;
  const c = cats[ci];
  const base = `categories.${ci}`;
  main.innerHTML = mobileTop() + `
    <div class="page-head"><h1>Menu</h1><span class="muted">${cats.reduce((n, x) => n + x.items.length, 0)} items in ${cats.length} sections</span></div>
    <div class="editor">
      <nav class="card cat-list" aria-label="Menu sections">
        ${cats.map((x, i) => `<button type="button" class="cat-btn ${i === ci ? "on" : ""} ${x.visible ? "" : "hidden-cat"}" data-pick-cat="${i}">
          ${thumb(x.img)}<span class="nm">${esc(x.name)}</span><small class="muted num">${x.items.length}</small></button>`).join("")}
        <button type="button" class="btn btn-ghost btn-sm cat-add" data-add-cat>${ico("i-plus")}Add section</button>
      </nav>
      <div class="stack" style="max-width:none">
        <div class="card">
          <div class="section">
            <div class="section-title"><h2>Section details</h2><p>How this section appears on the menu.</p></div>
            <div class="grid-2">
              ${field("Section name", base + ".name", { max: 60 })}
              ${field("Short description", base + ".blurb", { max: 160, placeholder: "e.g. Folded to order on the hot plate.", help: "Optional. Shown under the section name." })}
            </div>
            <div class="field"><span class="label">Picture</span>
              <div class="pic-picker">
                ${c.image ? `<span class="pic-opt"><span class="thumb photo-sel" style="width:56px;height:56px"><img src="${imageUrl(c.image)}" alt="Section photo"></span></span>` : ""}
                ${PICTURES.map((p) => `<label class="pic-opt" title="${p === "badge" ? "Logo" : p}"><input type="radio" name="pic" value="${p}" data-bind="${base}.img" data-also-clear="${base}.image" ${!c.image && c.img === p ? "checked" : ""}>${thumb(p)}</label>`).join("")}
                <button type="button" class="pic-upload" data-cat-photo title="Upload your own photo">${ico("i-upload")}<span>${c.image ? "Change" : "Upload"}</span></button>
              </div>
              <p class="help">${c.image ? 'Your photo is shown. Pick a drawing to go back, or <button type="button" class="link-btn" data-cat-photo-del>remove the photo</button>.' : "Pick a drawing, or upload your own photo."}</p>
            </div>
            <div class="toggles">
              ${sw("Show on the website", base + ".visible")}
              <span class="extras-link">${(() => {
                const gs = state.draft.extras.filter((g) => (g.sections || []).includes(c.id));
                return gs.length ? `Extras: <b>${gs.map((g) => esc(g.name)).join(", ")}</b>` : "No extras on this section";
              })()} · <a href="#extras">Change in Extras</a></span>
            </div>
            <div class="grid-2">
              <div class="field"><label for="choice-label">Extra choice <span class="muted">(optional)</span></label>
                <input id="choice-label" data-choice="label" value="${esc(c.choice ? c.choice.label : "")}" placeholder="e.g. Serve it"></div>
              <div class="field"><label for="choice-values">Options, separated by commas</label>
                <input id="choice-values" data-choice="values" value="${esc(c.choice ? c.choice.values.join(", ") : "")}" placeholder="e.g. Hot, Iced">
                <p class="help">For a pick that doesn't change the price, like Hot or Iced.</p></div>
            </div>
            <div class="danger-zone">
              <div style="display:flex;gap:8px">
                <button class="btn btn-line btn-sm" type="button" data-move-cat="-1" ${ci === 0 ? "disabled" : ""}>${ico("i-up")}Move up</button>
                <button class="btn btn-line btn-sm" type="button" data-move-cat="1" ${ci === cats.length - 1 ? "disabled" : ""}>${ico("i-down")}Move down</button>
              </div>
              <span data-del-cat-wrap><button class="btn btn-danger btn-sm" type="button" data-del-cat ${cats.length < 2 ? "disabled" : ""}>${ico("i-trash")}Delete section</button></span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="section" style="padding-bottom:12px"><div class="section-title"><h2>Items</h2><p>Turn off <b>In stock</b> to show an item as sold out. The star marks it as a house favourite on the home page.</p></div></div>
          <div class="items-table">
            <div class="items-head"><span></span><span>Photo</span><span>Name &amp; description</span><span>Price</span><span>In stock</span><span></span></div>
            ${c.items.map((it, ii) => itemRow(it, ci, ii, c.items.length)).join("") || `<p class="list-empty">No items yet.</p>`}
          </div>
          <div class="add-row"><button class="btn btn-line" type="button" data-add-item>${ico("i-plus")}Add item</button></div>
        </div>
      </div>
    </div>`;
}

function itemRow(it, ci, ii, n) {
  const p = `categories.${ci}.items.${ii}`;
  const price = it.options.length
    ? `<div class="sizes">${it.options.map((o, oi) => `<div class="size-row">
        <input class="input" aria-label="Size name" data-bind="${p}.options.${oi}.label" value="${esc(o.label)}" placeholder="12 pcs" maxlength="30">
        <div class="input-wrap"><input class="input money" aria-label="Size price" inputmode="numeric" data-bind="${p}.options.${oi}.price" data-kind="money" value="${fmtMoneyInput(o.price)}"><span class="suffix">L.L.</span></div>
        <button class="icon-btn danger" type="button" data-del-size="${oi}" data-item="${ii}" aria-label="Remove size">${ico("i-x")}</button></div>`).join("")}
        <button class="link-btn" type="button" data-add-size="${ii}">+ Add size</button>
        <button class="link-btn" type="button" data-one-price="${ii}">Use one price</button></div>`
    : `<div class="sizes"><div class="input-wrap"><input class="input money" aria-label="Price" inputmode="numeric" data-bind="${p}.price" data-kind="money" value="${fmtMoneyInput(it.price)}"><span class="suffix">L.L.</span></div>
        <button class="link-btn" type="button" data-use-sizes="${ii}">+ Sizes (e.g. 12 / 25 pcs)</button></div>`;
  return `<div class="irow ${it.available ? "" : "out"}">
    <span class="grip muted num" aria-hidden="true">${ii + 1}</span>
    <div class="pic-cell">${it.image
      ? `<button class="photo-btn has" type="button" data-item-photo="${ii}" title="Change photo"><img src="${imageUrl(it.image)}" alt=""></button><button class="link-btn" type="button" data-item-photo-del="${ii}">Remove</button>`
      : `<button class="photo-btn" type="button" data-item-photo="${ii}" title="Add a photo">${ico("i-image")}<span>Photo</span></button>`}</div>
    <div class="name-cell">
      <input class="input" aria-label="Item name" data-bind="${p}.name" data-k="name" value="${esc(it.name)}" maxlength="80">
      <input class="input desc" aria-label="Description" data-bind="${p}.desc" value="${esc(it.desc)}" placeholder="Description (optional)" maxlength="200">
    </div>
    <div class="price-cell">${price}</div>
    <div class="avail"><label class="switch"><input type="checkbox" data-bind="${p}.available" data-kind="bool" ${it.available ? "checked" : ""}><span class="track"></span><span class="sr">In stock</span></label></div>
    <div class="row-actions">
      <button class="icon-btn star ${it.featured ? "on" : ""}" type="button" data-star="${ii}" aria-pressed="${it.featured}" title="${it.featured ? "House favourite" : "Make a house favourite"}">${ico("i-star")}</button>
      <button class="icon-btn" type="button" data-move-item="${ii}" data-dir="-1" ${ii === 0 ? "disabled" : ""} aria-label="Move up">${ico("i-up")}</button>
      <button class="icon-btn" type="button" data-move-item="${ii}" data-dir="1" ${ii === n - 1 ? "disabled" : ""} aria-label="Move down">${ico("i-down")}</button>
      <span data-del-wrap="${ii}"><button class="icon-btn danger" type="button" data-del-item="${ii}" aria-label="Delete ${esc(it.name)}">${ico("i-trash")}</button></span>
    </div>
  </div>`;
}

function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

main.addEventListener("input", (e) => {
  const el = e.target.closest("[data-choice]");
  if (!el || state.route !== "menu") return;
  const c = state.draft.categories[state.menuCat];
  const label = $("#choice-label").value;
  const values = $("#choice-values").value.split(",").map((v) => v.trim()).filter(Boolean);
  c.choice = values.length ? { label: label.trim() || "Choose", values } : null;
  updatePublishBar();
});

/* ---------- Extras ---------- */

function renderExtras() {
  const groups = state.draft.extras;
  main.innerHTML = mobileTop() + `
    <div class="page-head"><h1>Extras</h1><span class="muted">Toppings and add-ons. Each group chooses the menu sections it's offered on.</span></div>
    <div class="stack">
      ${groups.map((g, gi) => `<div class="card">
        <div class="group-head">
          <input class="input" aria-label="Group name" data-bind="extras.${gi}.name" value="${esc(g.name)}" maxlength="50">
          <span class="muted">${g.items.length} extras</span>
          <label class="max-pick">Customers can pick
            <select data-group-max="${gi}" aria-label="How many customers can pick">${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${Number(g.max || 0) === n ? "selected" : ""}>${n ? "up to " + n : "any number"}</option>`).join("")}</select>
          </label>
          <span style="margin-left:auto;display:flex;gap:2px">
            <button class="icon-btn" type="button" data-move-group="${gi}" data-dir="-1" ${gi === 0 ? "disabled" : ""} aria-label="Move group up">${ico("i-up")}</button>
            <button class="icon-btn" type="button" data-move-group="${gi}" data-dir="1" ${gi === groups.length - 1 ? "disabled" : ""} aria-label="Move group down">${ico("i-down")}</button>
            <span data-del-group-wrap="${gi}"><button class="icon-btn danger" type="button" data-del-group="${gi}" aria-label="Delete group">${ico("i-trash")}</button></span>
          </span>
        </div>
        <div class="offered">
          <span class="label">Offered on</span>
          <div class="chip-checks">${state.draft.categories.map((c) => `<label class="chip-check"><input type="checkbox" data-group-section="${gi}" value="${esc(c.id)}" ${(g.sections || []).includes(c.id) ? "checked" : ""}><span>${esc(c.name)}</span></label>`).join("")}</div>
          ${(g.sections || []).length ? "" : `<p class="help warn">Not offered anywhere yet. Tick the sections where customers can add these.</p>`}
        </div>
        ${g.items.map((x, xi) => `<div class="xrow">
          <input class="input" aria-label="Extra name" data-bind="extras.${gi}.items.${xi}.name" value="${esc(x.name)}" maxlength="60">
          <div class="input-wrap"><input class="input money" aria-label="Price" inputmode="numeric" data-bind="extras.${gi}.items.${xi}.price" data-kind="money" value="${fmtMoneyInput(x.price)}"><span class="suffix">L.L.</span></div>
          <label class="switch" title="In stock"><input type="checkbox" data-bind="extras.${gi}.items.${xi}.available" data-kind="bool" data-refresh="no" ${x.available ? "checked" : ""}><span class="track"></span><span class="sr">In stock</span></label>
          <button class="icon-btn danger" type="button" data-del-extra="${xi}" data-group="${gi}" aria-label="Delete ${esc(x.name)}">${ico("i-trash")}</button>
        </div>`).join("")}
        <div class="add-row"><button class="btn btn-line btn-sm" type="button" data-add-extra="${gi}">${ico("i-plus")}Add extra</button></div>
      </div>`).join("")}
      <div><button class="btn btn-line" type="button" data-add-group>${ico("i-plus")}Add group</button></div>
    </div>`;
}

/* ---------- Website text ---------- */

function renderTexts() {
  main.innerHTML = mobileTop() + `
    <div class="page-head"><h1>Website text</h1></div>
    <div class="stack"><div class="card">
      <div class="section">
        <div class="section-title"><h2>Announcement bar</h2><p>A short message in a bar at the top of the website. Leave it empty to hide the bar.</p></div>
        ${field("Announcement", "texts.announcement", { placeholder: "e.g. New: Dubai Crepe is back this week!" })}
      </div>
      <div class="section">
        <div class="section-title"><h2>Top of the home page</h2></div>
        ${field("Small line above the headline", "texts.heroEyebrow")}
        ${field("Headline", "texts.heroTitle")}
        ${field("Introduction", "texts.heroText", { textarea: true })}
      </div>
      <div class="section">
        <div class="section-title"><h2>About us</h2></div>
        ${field("Title", "texts.aboutTitle")}
        ${field("Text", "texts.aboutText", { textarea: true, rows: 7, help: "Leave an empty line between paragraphs." })}
      </div>
      <div class="section">
        <div class="section-title"><h2>Hours &amp; contact</h2></div>
        ${field("Title", "texts.contactTitle")}
        ${field("Text", "texts.contactText", { textarea: true, rows: 2 })}
      </div>
    </div></div>`;
}

/* ---------- Theme ---------- */

const COLOR_FIELDS = [
  ["brand", "Brand colour", "Headlines, buttons and the logo."],
  ["accent", "Accent colour", "Stripes, badges and highlights."],
  ["soft", "Soft colour", "Cards, the second stripe colour, light panels."],
  ["background", "Background", "The page itself."]
];

function themeOf() {
  state.draft.theme = { ...DEFAULT_THEME, ...(state.draft.theme || {}) };
  state.draft.media = { ...DEFAULT_MEDIA, ...(state.draft.media || {}) };
  return state.draft.theme;
}

function previewVars(t) {
  const df = DISPLAY_FONTS[t.displayFont] || DISPLAY_FONTS.Fraunces;
  const bf = BODY_FONTS[t.bodyFont] || BODY_FONTS.Figtree;
  useFont(df); useFont(bf);
  const r = { soft: "14px", round: "22px", square: "5px" }[t.corners];
  return `--p-brand:${t.brand};--p-accent:${t.accent};--p-soft:${t.soft};--p-bg:${t.background};--p-display:${df.stack};--p-body:${bf.stack};--p-r:${r};--p-pill:${t.corners === "square" ? "6px" : "999px"}`;
}

function themeWarnings(t) {
  const w = [];
  if (contrast(t.brand, t.background) < 4.5) w.push("Text in the brand colour will be hard to read on this background. Pick a darker brand colour or a lighter background.");
  if (contrast(t.brand, t.soft) < 3) w.push("The brand colour and the soft colour are too close, so text on cards may be hard to read.");
  return w;
}

function paintThemeExtras() {
  const t = state.draft.theme;
  const pv = $("[data-preview]");
  if (pv) pv.setAttribute("style", previewVars(t));
  const warn = $("[data-theme-warn]");
  if (warn) {
    const w = themeWarnings(t);
    warn.hidden = !w.length;
    warn.innerHTML = w.map((x) => `<p>${esc(x)}</p>`).join("");
  }
  $$("[data-preset]").forEach((b) => b.classList.toggle("on", b.dataset.preset === t.preset));
}

// Which version the preview shows: what visitors get, or the admin's pick when it depends on the device.
let previewPick = null;
function previewDark(t) {
  if (t.mode === "dark") return previewPick !== "light";
  if (t.mode === "light") return previewPick === "dark";
  return previewPick === "dark";
}

function renderTheme() {
  const t = themeOf();
  const m = state.draft.media;
  const seg = (path, value, options) => `<div class="segmented" role="radiogroup">${options.map(([v, label]) =>
    `<label><input type="radio" name="${path}" value="${v}" data-bind="${path}" ${value === v ? "checked" : ""}><span>${label}</span></label>`).join("")}</div>`;
  const picBox = (kind, id, fallback) => `<div class="media-box ${id ? "has" : ""}">
      ${id ? `<img src="${imageUrl(id)}" alt="">` : `<img class="fallback" src="${fallback}" alt="">`}
    </div>
    <div class="media-actions">
      <button class="btn btn-line btn-sm" type="button" data-media-photo="${kind}">${ico("i-upload")}${id ? "Change picture" : "Upload a picture"}</button>
      ${id ? `<button class="btn btn-ghost btn-sm" type="button" data-media-del="${kind}">Use the original drawing</button>` : ""}
    </div>`;
  main.innerHTML = mobileTop() + `
    <div class="page-head"><h1>Theme</h1><span class="muted">Colours, fonts and pictures of the website.</span></div>
    <div class="theme-layout">
      <div class="stack" style="max-width:none">
        <div class="card">
          <div class="section">
            <div class="section-title"><h2>Colour sets</h2><p>Start from a set, then fine-tune the colours below.</p></div>
            <div class="presets">${Object.entries(THEME_PRESETS).map(([k, p]) => `<button type="button" class="preset ${t.preset === k ? "on" : ""}" data-preset="${k}">
              <span class="swatches">${["brand", "accent", "soft", "background"].map((c) => `<i style="background:${p[c]}"></i>`).join("")}</span><span>${esc(p.label)}</span></button>`).join("")}</div>
          </div>
          <div class="section">
            <div class="section-title"><h2>Colours</h2></div>
            <div class="colors">${COLOR_FIELDS.map(([k, label, help]) => `<div class="color-field">
              <input type="color" id="c-${k}" value="${t[k]}" data-theme-color="${k}" aria-label="${label}">
              <div><label for="c-${k}" class="label">${label}</label><p class="help">${help}</p></div>
              <input class="input hex" value="${t[k]}" data-theme-hex="${k}" maxlength="7" aria-label="${label} code" spellcheck="false">
            </div>`).join("")}</div>
            <div class="notice-warn" data-theme-warn hidden></div>
          </div>
          <div class="section">
            <div class="section-title"><h2>Fonts</h2></div>
            <div class="grid-2">
              <div class="field"><label for="f-display">Headlines</label><select id="f-display" data-bind="theme.displayFont">${Object.entries(DISPLAY_FONTS).map(([k, f]) => `<option value="${esc(k)}" ${t.displayFont === k ? "selected" : ""}>${esc(f.label)}</option>`).join("")}</select></div>
              <div class="field"><label for="f-body">Text</label><select id="f-body" data-bind="theme.bodyFont">${Object.entries(BODY_FONTS).map(([k, f]) => `<option value="${esc(k)}" ${t.bodyFont === k ? "selected" : ""}>${esc(f.label)}</option>`).join("")}</select></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title"><h2>Shape &amp; pattern</h2></div>
            <div class="grid-2">
              <div class="field"><span class="label">Corners</span>${seg("theme.corners", t.corners, [["soft", "Soft"], ["round", "Round"], ["square", "Square"]])}</div>
              <div class="field"><span class="label">Pattern</span>${seg("theme.pattern", t.pattern, [["stripes", "Stripes"], ["grid", "Grid"], ["plain", "Plain"]])}</div>
            </div>
            <div class="field"><span class="label">Light or dark: default look</span>${seg("theme.mode", t.mode, [["light", "Light"], ["dark", "Dark"], ["auto", "Match the visitor's device"]])}
              <p class="help">${{ light: "Visitors see the light version", auto: "Visitors whose phone or computer is set to dark mode see the dark version, others see light", dark: "Visitors see the dark version" }[t.mode]}${t.allowToggle ? ", until they tap the sun/moon button to switch." : "."}</p></div>
            ${sw("Show a sun/moon button on the website so customers can switch between light and dark", "theme.allowToggle")}
          </div>
          <div class="section">
            <div class="section-title"><h2>Home page picture</h2><p>The big picture at the top of the website. A wide photo of your crepes or shop works best.</p></div>
            ${picBox("hero", m.hero, "../assets/img/crepe.webp")}
            ${sw("Show the drawings around it (logo sticker, spreader, pancake)", "media.heroDrawings")}
          </div>
          <div class="section">
            <div class="section-title"><h2>About us picture</h2><p>Shown in the round frame next to your story.</p></div>
            ${picBox("about", m.about, "../assets/logo-badge.svg")}
          </div>
          <div class="section">
            <button class="btn btn-ghost btn-sm" type="button" data-theme-reset>Reset colours, fonts and shape to the original</button>
          </div>
        </div>
      </div>
      <aside class="theme-preview">
        <div class="preview-bar"><p class="label">Preview</p>
          <div class="segmented" role="radiogroup" aria-label="Preview colours">
            <label><input type="radio" name="pv-mode" value="light" data-preview-mode ${previewDark(t) ? "" : "checked"}><span>Light</span></label>
            <label><input type="radio" name="pv-mode" value="dark" data-preview-mode ${previewDark(t) ? "checked" : ""}><span>Dark</span></label>
          </div>
        </div>
        <div class="tp card ${previewDark(t) ? "dark" : ""}" data-preview data-pattern="${t.pattern}">
          <div class="tp-head"><svg class="tp-mark" aria-hidden="true"><use href="#cb-mark"></use></svg><span class="tp-pill">Your order <b>2</b></span></div>
          <div class="tp-hero">
            <div class="tp-copy"><p class="tp-kicker">Crepes · Waffles</p><h3 class="tp-h">${esc(state.draft.texts.heroTitle)}</h3><span class="tp-btn">Start your order</span></div>
            <div class="tp-panel">${m.hero ? `<img src="${imageUrl(m.hero)}" alt="">` : `<img class="tp-drawing" src="../assets/img/crepe.webp" alt="">`}</div>
          </div>
          <div class="tp-menu">
            <div class="tp-cat"><span class="tp-badge"><img src="../assets/img/crepe.webp" alt=""></span><b>Crepes</b></div>
            <div class="tp-row"><span>Nutella Crepe <i>Popular</i></span><span>350,000 L.L.</span><span class="tp-add">+</span></div>
            <div class="tp-row"><span>Lotus Crepe</span><span>350,000 L.L.</span><span class="tp-add">+</span></div>
          </div>
          <div class="tp-band">A crêperie with a sweet tooth.</div>
        </div>
      </aside>
    </div>`;
  paintThemeExtras();
}

main.addEventListener("change", (e) => {
  if (!e.target.matches("[data-preview-mode]")) return;
  previewPick = e.target.value;
  const pv = $("[data-preview]");
  if (pv) pv.classList.toggle("dark", previewPick === "dark");
});

main.addEventListener("input", (e) => {
  const el = e.target;
  const k = el.dataset.themeColor || el.dataset.themeHex;
  if (!k || state.route !== "theme") return;
  let v = el.value.trim();
  if (el.dataset.themeHex) {
    if (!v.startsWith("#")) v = "#" + v;
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) return;
    $(`[data-theme-color="${k}"]`).value = v.toLowerCase();
  } else {
    $(`[data-theme-hex="${k}"]`).value = v.toUpperCase();
  }
  state.draft.theme[k] = v.toUpperCase();
  state.draft.theme.preset = "custom";
  paintThemeExtras();
  updatePublishBar();
});

/* ---------- Shop settings ---------- */

function renderSettings() {
  const s = state.draft.settings;
  main.innerHTML = mobileTop() + `
    <div class="page-head"><h1>Shop settings</h1></div>
    <div class="stack"><div class="card">
      <div class="section">
        <div class="section-title"><h2>Online orders</h2><p>Pause orders when you're too busy or closed for the day.</p></div>
        ${sw("Accept orders on the website", "settings.orderingOpen")}
        ${s.orderingOpen ? "" : field("Message shown while orders are paused", "settings.pausedMessage", { textarea: true, rows: 2 })}
        <div class="grid-2">
          ${field("Delivery fee", "settings.deliveryFee", { money: true, help: "Added to delivery orders. Use 0 to confirm the fee on WhatsApp." })}

        </div>
      </div>
      <div class="section">
        <div class="section-title"><h2>Prices in US dollars</h2><p>Customers can switch the menu between L.L. and $. Prices in L.L. stay the official ones; dollars are worked out from your rate.</p></div>
        ${sw("Let customers see prices in US dollars", "settings.showUsd")}
        <div class="grid-2">
          ${field("Exchange rate", "settings.usdRate", { money: true, suffix: "L.L. = $1", help: "How many Lebanese pounds make one dollar, e.g. 89,500. Update it when the rate changes." })}
          <div class="field"><span class="label">Show prices first in</span>
            <div class="segmented" role="radiogroup">
              <label><input type="radio" name="settings.defaultCurrency" value="lbp" data-bind="settings.defaultCurrency" ${s.defaultCurrency !== "usd" ? "checked" : ""}><span>L.L.</span></label>
              <label><input type="radio" name="settings.defaultCurrency" value="usd" data-bind="settings.defaultCurrency" ${s.defaultCurrency === "usd" ? "checked" : ""}><span>US dollars</span></label>
            </div>
            <p class="help">What new visitors see. Each customer can switch.</p>
          </div>
        </div>
        ${s.showUsd && s.usdRate > 0 ? `<p class="help">Example: a 350,000 L.L. crepe shows as <b>$${(350000 / s.usdRate).toFixed(2)}</b>.</p>` : s.showUsd ? `<p class="help warn">Add the exchange rate so dollar prices can be shown.</p>` : ""}
      </div>
      <div class="section">
        <div class="section-title"><h2>WhatsApp</h2><p>Orders from the website open a chat with this number.</p></div>
        <div class="grid-2">
          ${field("Number for WhatsApp", "settings.whatsappNumber", { digits: true, max: 20, help: "Country code and number, digits only. 961 is Lebanon, e.g. 96181908914." })}
          ${field("Number as shown on the website", "settings.whatsappDisplay", { max: 30 })}
        </div>
      </div>
      <div class="section">
        <div class="section-title"><h2>Location</h2></div>
        ${field("Address", "settings.address", { placeholder: "e.g. Hamra Street, Beirut", help: "Leave empty to hide it." })}
        ${field("Google Maps link", "settings.mapsUrl", { placeholder: "https://maps.app.goo.gl/…", help: "In Google Maps, find the shop, tap Share and copy the link." })}
      </div>
      <div class="section">
        <div class="section-title"><h2>Opening hours</h2><p>The website shows “Open now” or “Closed” from these. If closing time is earlier than opening time, it means after midnight.</p></div>
        <div class="hours-table">
          ${DAYS.map((d, i) => {
            const h = s.hours[i];
            return `<div class="hrow ${h.closed ? "closed" : ""}">
              <span class="day">${DAY_NAMES[d]}</span>
              <label class="switch"><input type="checkbox" data-bind="settings.hours.${i}.closed" data-kind="bool" ${h.closed ? "checked" : ""}><span class="track"></span>Closed</label>
              <input class="input" type="time" aria-label="${DAY_NAMES[d]} opens" data-bind="settings.hours.${i}.open" value="${esc(h.open)}" ${h.closed ? "disabled" : ""}>
              <input class="input" type="time" aria-label="${DAY_NAMES[d]} closes" data-bind="settings.hours.${i}.close" value="${esc(h.close)}" ${h.closed ? "disabled" : ""}>
            </div>`;
          }).join("")}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-line btn-sm" type="button" data-copy-hours>Copy Monday to every day</button>
          <button class="btn btn-ghost btn-sm" type="button" data-clear-hours>Clear all hours</button>
        </div>
      </div>
      <div class="section">
        <div class="section-title"><h2>Social links</h2><p>Full links starting with https://. Leave empty to hide.</p></div>
        ${field("Instagram", "settings.instagram", { placeholder: "https://www.instagram.com/…" })}
        ${field("Facebook", "settings.facebook", { placeholder: "https://www.facebook.com/…" })}
        ${field("TikTok", "settings.tiktok", { placeholder: "https://www.tiktok.com/@…" })}
      </div>
    </div></div>`;
}

/* ---------- Clicks ---------- */

function inlineConfirm(wrap, label, onYes) {
  const prev = wrap.innerHTML;
  wrap.innerHTML = `<span class="confirm">${label} <button class="btn btn-danger btn-sm" type="button" data-yes>Delete</button><button class="btn btn-ghost btn-sm" type="button" data-no>Keep</button></span>`;
  $("[data-yes]", wrap).onclick = onYes;
  $("[data-no]", wrap).onclick = () => (wrap.innerHTML = prev);
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button, a");
  if (!t) return;
  const d = t.dataset;
  const draft = state.draft;

  if ("logout" in d) {
    if (isDirty() && !confirmLeave()) return;
    await fetch("/api/admin/logout", { method: "POST" });
    state.published = state.draft = null;
    showView("login");
    return;
  }
  if ("publish" in d) return publish();
  if ("discard" in d) { state.draft = clone(state.published); rerender(); toast("Changes discarded"); return; }

  // Orders
  if (d.order) { state.orders.selected = state.orders.list.find((o) => o.id === Number(d.order)) || null; paintOrders(); return; }
  if ("closeDetail" in d) { state.orders.selected = null; paintOrders(); return; }
  if (d.statusTab) { state.orders.status = d.statusTab; paintOrders(); loadOrders(); return; }
  if ("refresh" in d) { loadOrders(); return; }
  if ("sound" in d) {
    soundOn = !soundOn; store.set("cb-admin-sound", soundOn);
    if (soundOn) { chime(); toast("Sound on: you'll hear a chime for new orders"); } else toast("Sound off");
    t.classList.toggle("on", soundOn); t.setAttribute("aria-pressed", soundOn);
    return;
  }
  if (d.setStatus) return setStatus(d.setStatus);
  if ("cancel" in d) {
    const wrap = $("[data-actions]");
    wrap.innerHTML = `<span class="confirm">Cancel this order?</span><button class="btn btn-danger" type="button" data-set-status="cancelled">Yes, cancel it</button><button class="btn btn-ghost" type="button" data-keep>Keep it</button>`;
    return;
  }
  if ("keep" in d) { paintDetail(); return; }

  if (!draft) return;
  const cat = draft.categories[state.menuCat];

  // Pictures
  if (d.itemPhoto != null) {
    const id = await uploadImage("item");
    if (id) { cat.items[Number(d.itemPhoto)].image = id; rerender(); }
    return;
  }
  if (d.itemPhotoDel != null) { cat.items[Number(d.itemPhotoDel)].image = ""; rerender(); return; }
  if ("catPhoto" in d) {
    const id = await uploadImage("section");
    if (id) { cat.image = id; rerender(); }
    return;
  }
  if ("catPhotoDel" in d) { cat.image = ""; rerender(); return; }
  if (d.mediaPhoto) {
    const id = await uploadImage(d.mediaPhoto);
    if (id) { themeOf(); draft.media[d.mediaPhoto] = id; rerender(); }
    return;
  }
  if (d.mediaDel) { themeOf(); draft.media[d.mediaDel] = ""; rerender(); return; }
  // Theme
  if (d.preset) {
    const p = THEME_PRESETS[d.preset];
    themeOf();
    Object.assign(draft.theme, { preset: d.preset, brand: p.brand, accent: p.accent, soft: p.soft, background: p.background });
    rerender();
    return;
  }
  if ("themeReset" in d) { draft.theme = { ...DEFAULT_THEME }; rerender(); return; }

  // Menu sections
  if (d.pickCat != null) { state.menuCat = Number(d.pickCat); rerender(); return; }
  if ("addCat" in d) {
    draft.categories.push({ id: uid("section"), name: "New section", img: "badge", blurb: "", extras: false, choice: null, visible: true, items: [] });
    state.menuCat = draft.categories.length - 1;
    rerender();
    const inp = main.querySelector('[data-bind$=".name"]'); if (inp) { inp.focus(); inp.select(); }
    return;
  }
  if (d.moveCat) { const dir = Number(d.moveCat); move(draft.categories, state.menuCat, dir); state.menuCat += dir; rerender(); return; }
  if ("delCat" in d) {
    inlineConfirm($("[data-del-cat-wrap]"), `Delete “${esc(cat.name)}” and its ${cat.items.length} items?`, () => {
      draft.categories.splice(state.menuCat, 1); state.menuCat = Math.max(0, state.menuCat - 1); rerender();
    });
    return;
  }
  // Menu items
  if ("addItem" in d) {
    cat.items.push({ id: cat.id + "/" + uid("item"), name: "New item", desc: "", price: 0, options: [], available: true, featured: false });
    rerender();
    const rows = $$(".irow"); const inp = rows[rows.length - 1].querySelector('[data-k="name"]'); inp.focus(); inp.select();
    return;
  }
  if (d.moveItem != null) { move(cat.items, Number(d.moveItem), Number(d.dir)); rerender(); return; }
  if (d.star != null) { const it = cat.items[Number(d.star)]; it.featured = !it.featured; rerender(); return; }
  if (d.delItem != null) {
    const i = Number(d.delItem);
    inlineConfirm($(`[data-del-wrap="${i}"]`), "", () => { cat.items.splice(i, 1); rerender(); });
    return;
  }
  if (d.useSizes != null) { const it = cat.items[Number(d.useSizes)]; it.options = [{ label: "Small", price: it.price || 0 }, { label: "Large", price: it.price || 0 }]; it.price = null; rerender(); return; }
  if (d.onePrice != null) { const it = cat.items[Number(d.onePrice)]; it.price = it.options[0] ? it.options[0].price : 0; it.options = []; rerender(); return; }
  if (d.addSize != null) { const it = cat.items[Number(d.addSize)]; it.options.push({ label: "", price: 0 }); rerender(); return; }
  if (d.delSize != null) {
    const it = cat.items[Number(d.item)]; it.options.splice(Number(d.delSize), 1);
    if (!it.options.length) { it.price = 0; }
    rerender(); return;
  }
  // Extras
  if ("addGroup" in d) { draft.extras.push({ id: uid("group"), name: "New group", sections: [], max: 0, items: [] }); rerender(); return; }
  if (d.moveGroup != null) { move(draft.extras, Number(d.moveGroup), Number(d.dir)); rerender(); return; }
  if (d.delGroup != null) {
    const gi = Number(d.delGroup);
    inlineConfirm($(`[data-del-group-wrap="${gi}"]`), "", () => { draft.extras.splice(gi, 1); rerender(); });
    return;
  }
  if (d.addExtra != null) {
    draft.extras[Number(d.addExtra)].items.push({ id: uid("extra"), name: "New extra", price: 0, available: true });
    rerender();
    const card = $$(".card")[Number(d.addExtra)]; const inps = card.querySelectorAll('.xrow input[aria-label="Extra name"]'); const inp = inps[inps.length - 1]; inp.focus(); inp.select();
    return;
  }
  if (d.delExtra != null) { draft.extras[Number(d.group)].items.splice(Number(d.delExtra), 1); rerender(); return; }
  // Hours
  if ("copyHours" in d) {
    const m = draft.settings.hours[0];
    draft.settings.hours = draft.settings.hours.map((h) => ({ ...h, open: m.open, close: m.close, closed: m.closed }));
    rerender(); return;
  }
  if ("clearHours" in d) { draft.settings.hours = draft.settings.hours.map((h) => ({ ...h, open: "", close: "", closed: false })); rerender(); return; }
});

// Extras: offered-on sections and pick limit
main.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.groupSection != null) {
    const g = state.draft.extras[Number(t.dataset.groupSection)];
    const set = new Set(g.sections || []);
    if (t.checked) set.add(t.value); else set.delete(t.value);
    g.sections = state.draft.categories.map((c) => c.id).filter((id) => set.has(id));
    rerender();
  } else if (t.dataset.groupMax != null) {
    state.draft.extras[Number(t.dataset.groupMax)].max = Number(t.value);
    updatePublishBar();
  }
});

// Order search & range
main.addEventListener("change", (e) => {
  if (e.target.matches("[data-range]")) { state.orders.range = e.target.value; loadOrders(); }
});
let qTimer;
main.addEventListener("input", (e) => {
  if (!e.target.matches("[data-order-q]")) return;
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { state.orders.q = e.target.value.trim(); loadOrders(); }, 300);
});
// Staff note saves when the field loses focus
main.addEventListener("focusout", async (e) => {
  if (!e.target.matches("[data-staff-note]")) return;
  const x = state.orders.selected;
  if (!x || e.target.value === x.staffNote) return;
  try {
    const { order } = await api("orders/" + x.id, { method: "PATCH", body: { staffNote: e.target.value } });
    x.staffNote = order.staffNote;
    toast("Note saved");
  } catch (err) { if (err.status !== 401) toast(err.message, true); }
});

/* ---------- Publish ---------- */

function validate(c) {
  if (c.settings.whatsappNumber.replace(/\D/g, "").length < 8) return "The WhatsApp number looks too short. Use the country code and number, like 96181908914.";
  for (const cat of c.categories) {
    if (!cat.name.trim()) return "Every menu section needs a name.";
    for (const it of cat.items) {
      if (!it.name.trim()) return `An item in “${cat.name}” has no name.`;
      if (it.options.some((o) => !o.label.trim())) return `“${it.name}” has a size without a name.`;
    }
  }
  if (c.settings.showUsd && !(c.settings.usdRate > 0)) return "Add the exchange rate (L.L. per $1) to show prices in US dollars, or switch dollar prices off.";
  for (const h of c.settings.hours) {
    if (!h.closed && (!!h.open !== !!h.close)) return `${DAY_NAMES[h.day]} needs both an opening and a closing time, or neither.`;
  }
  return "";
}

async function publish() {
  const problem = validate(state.draft);
  if (problem) { toast(problem, true); return; }
  const btn = $("[data-publish]");
  btn.disabled = true;
  btn.textContent = "Publishing…";
  try {
    const data = await api("content", { method: "PUT", body: { content: state.draft, baseUpdatedAt: state.baseUpdatedAt } });
    state.published = data.content;
    state.draft = clone(data.content);
    state.baseUpdatedAt = data.updatedAt;
    rerender();
    toast("Published. The website shows your changes now." + (data.removedImages ? ` ${data.removedImages} old ${data.removedImages === 1 ? "picture" : "pictures"} removed.` : ""));
  } catch (e) {
    if (e.status !== 401) toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Publish changes";
  }
}

const confirmLeave = () => window.confirm("You have unpublished changes. Leave without publishing?");
window.addEventListener("beforeunload", (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ""; } });

/* ---------- Sign in & boot ---------- */

$("[data-login]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw = $("#login-password");
  const err = $("[data-login-error]");
  const btn = $("[data-login-btn]");
  err.hidden = true;
  if (!pw.value) { err.hidden = false; err.textContent = "Type the admin password."; pw.focus(); return; }
  btn.disabled = true;
  btn.textContent = "Signing in…";
  try {
    await api("login", { method: "POST", body: { password: pw.value } });
    pw.value = "";
    await enterApp();
  } catch (ex) {
    err.hidden = false;
    err.textContent = ex.message;
    pw.select();
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

async function enterApp() {
  const data = await api("content");
  state.published = data.content;
  state.draft = clone(data.content);
  state.baseUpdatedAt = data.updatedAt;
  state.orders.fetchedAt = 0;
  state.orders.newestId = null;
  showView("app");
  route();
  if (state.route !== "orders") loadOrders({ quiet: true });
  startPolling();
}

function showSetup(me, reason) {
  const status = $("[data-setup-status]");
  $$("[data-setup]").forEach((li) => {
    const known = me && me.setup;
    li.classList.toggle("done", !!(known && me.setup[li.dataset.setup]));
    li.classList.toggle("missing", !!(known && !me.setup[li.dataset.setup]));
  });
  status.hidden = !reason;
  status.textContent = reason || "";
  showView("setup");
}

async function boot() {
  let me;
  try {
    const r = await fetch("/api/admin/me", { credentials: "same-origin", cache: "no-store" });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.includes("application/json")) {
      showSetup(null, `The admin's server code isn't running (the check returned ${r.status}${type.includes("html") ? ", a web page instead of data" : ""}). This means the latest deployment didn't include it: check that it finished, and that the project is deployed from this repository.`);
      return;
    }
    me = await r.json();
  } catch {
    showSetup(null, "Couldn't reach the admin's server code. Check your connection, then check that the latest deployment finished.");
    return;
  }
  if (!me.setup.database || !me.setup.password) {
    const missing = [!me.setup.database && "the database", !me.setup.password && "the admin password"].filter(Boolean).join(" and ");
    showSetup(me, "The server is running, but " + missing + (missing.includes(" and ") ? " are" : " is") + " missing.");
    return;
  }
  if (!me.signedIn) { showView("login"); return; }
  await enterApp();
}
boot();

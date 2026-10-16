// GET /api/admin/orders/export?scope=all|finished|older: the orders as a CSV file for Excel or Google Sheets.
import { db, fail, loadContent, rowToOrder } from "../../../../lib/server.js";
import { orderNumber } from "../../../../public/js/shared.js";
import { scopeWhere } from "./clear.js";

const cell = (v) => {
  const s = String(v == null ? "" : v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export async function onRequestGet({ request, env }) {
  const d = await db(env);
  if (!d) return fail(503, "The database is not connected.");
  const scope = new URL(request.url).searchParams.get("scope") || "all";
  const where = (await scopeWhere(scope, env)) || { sql: "1 = 1", args: [] };
  const { content } = await loadContent(env);
  const tz = content.settings.timezone || "Asia/Beirut";
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const rows = (await d.prepare("SELECT * FROM orders WHERE " + where.sql + " ORDER BY id").bind(...where.args).all()).results.map(rowToOrder);

  const head = ["Order", "Date", "Status", "Type", "Name", "Phone", "Address", "Items", "Customer note", "Staff note", "Subtotal (L.L.)", "Delivery (L.L.)", "Total (L.L.)"];
  const lines = [head.map(cell).join(",")];
  for (const o of rows) {
    const items = o.lines.map((l) => `${l.qty} × ${l.name}${l.option ? " (" + l.option + ")" : ""}${l.choice ? " " + l.choice : ""}${l.extras && l.extras.length ? " + " + l.extras.map((x) => x.name).join(", ") : ""}`).join("; ");
    lines.push([orderNumber(o.id), fmt.format(new Date(o.createdAt)), o.status, o.type, o.name, o.phone, o.address, items, o.notes, o.staffNote, o.subtotal, o.fee, o.total].map(cell).join(","));
  }
  const day = new Date().toISOString().slice(0, 10);
  // The BOM makes Excel read Arabic and other non-English letters correctly.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="crepe-beirut-orders-${scope}-${day}.csv"`,
      "cache-control": "no-store"
    }
  });
}

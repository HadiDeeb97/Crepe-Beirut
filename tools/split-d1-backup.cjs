#!/usr/bin/env node
/**
 * Makes a D1 backup (from `wrangler d1 export`) loadable with `wrangler d1 execute --file`.
 *
 * D1 refuses any single SQL statement over 100 KB ("statement too long: SQLITE_TOOBIG"), and
 * the export writes every photo as one INSERT. This rewrites each long INSERT as a short INSERT
 * with an empty value, followed by UPDATEs that append the value back in small pieces.
 * Photos come back byte for byte; the file you give it is not changed.
 *
 *   node tools/split-d1-backup.cjs crepe-backup.sql            (writes crepe-backup-ready.sql)
 *   node tools/split-d1-backup.cjs crepe-backup.sql out.sql
 */
const fs = require("fs");
const path = require("path");

const LIMIT = 90000;  // bytes per statement, under D1's 100 KB
const PIECE = 60000;  // bytes of value per UPDATE

const input = process.argv[2];
if (!input) {
  console.log("Usage: node split-d1-backup.cjs crepe-backup.sql [output.sql]");
  process.exit(1);
}
const output = process.argv[3] || path.join(path.dirname(input), path.basename(input, path.extname(input)) + "-ready.sql");
const sql = fs.readFileSync(input, "utf8");
const bytes = (s) => Buffer.byteLength(s, "utf8");

// Statements end at a ";" that is outside quotes and comments.
function statements(text) {
  const out = [];
  let start = 0, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "'" || c === '"') {
      i++;
      while (i < text.length) {
        if (text[i] === c) { if (text[i + 1] === c) { i += 2; continue; } break; }
        i++;
      }
      i++;
    } else if (c === "-" && text[i + 1] === "-") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (c === ";") {
      out.push(text.slice(start, i + 1).trim());
      start = ++i;
    } else i++;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

// The values of "VALUES(a,b,...)", each as its SQL text.
function values(text) {
  const out = [];
  let i = 0, cur = "";
  while (i < text.length) {
    const c = text[i];
    if (c === "'") {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "'") { if (text[j + 1] === "'") { j += 2; continue; } break; }
        j++;
      }
      cur += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === ",") { out.push(cur.trim()); cur = ""; i++; }
    else { cur += c; i++; }
  }
  out.push(cur.trim());
  return out;
}

function pieces(str, size) {
  const out = [];
  let cur = "", n = 0;
  for (const ch of str) {           // by code point, so emoji and Arabic letters stay whole
    const b = bytes(ch) * (ch === "'" ? 2 : 1);
    if (n + b > size && cur) { out.push(cur); cur = ""; n = 0; }
    cur += ch; n += b;
  }
  if (cur) out.push(cur);
  return out;
}

const INSERT = /^INSERT\s+INTO\s+("(?:[^"]|"")+"|\w+)\s*\(([^)]*)\)\s*VALUES\s*\(([\s\S]*)\)\s*;?$/i;
const lines = [];
let split = 0;
for (const st of statements(sql)) {
  const s = st.endsWith(";") ? st : st + ";";
  if (bytes(s) <= LIMIT) { lines.push(s); continue; }
  const m = s.match(INSERT);
  if (!m) throw new Error("A statement is too long and is not an INSERT, so it can't be split:\n" + s.slice(0, 200));
  const table = m[1], cols = m[2].split(",").map((c) => c.trim()), vals = values(m[3]);
  if (cols.length !== vals.length) throw new Error("Could not read the values of a row in " + table);
  const where = ` WHERE ${cols[0]} = ${vals[0]};`;  // the first column is the key in every table
  const updates = [];
  vals.forEach((v, k) => {
    if (k === 0 || bytes(v) <= PIECE) return;
    const col = cols[k];
    if (/^X'/i.test(v)) {
      const hex = v.slice(2, -1);
      vals[k] = "X''";
      for (let p = 0; p < hex.length; p += PIECE) updates.push(`UPDATE ${table} SET ${col} = ${col} || X'${hex.slice(p, p + PIECE)}'${where}`);
      updates.push(`UPDATE ${table} SET ${col} = CAST(${col} AS BLOB)${where}`);  // "||" gives text; make it a blob again
    } else if (v.startsWith("'")) {
      const str = v.slice(1, -1).replace(/''/g, "'");
      vals[k] = "''";
      for (const part of pieces(str, PIECE)) updates.push(`UPDATE ${table} SET ${col} = ${col} || '${part.replace(/'/g, "''")}'${where}`);
    } else throw new Error("A value in " + table + " is too long to split");
  });
  const first = `INSERT INTO ${table} (${m[2]}) VALUES(${vals.join(",")});`;
  for (const q of [first, ...updates]) {
    if (bytes(q) > LIMIT) throw new Error("A row in " + table + " is still too long after splitting");
    lines.push(q);
  }
  split++;
}

fs.writeFileSync(output, lines.join("\n") + "\n");
console.log(`Done. ${split} long row${split === 1 ? "" : "s"} split into smaller pieces.`);
console.log("Load this file: " + output);

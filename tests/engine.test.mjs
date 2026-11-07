/* Engine tests: the seeded library is valid, and every template builds a Word file and a cover preview. Run: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as docx from "docx";
import * as DC from "docx/charts";
import { makeLib, validateLibrary } from "../src/engine/library.js";
import RD from "../src/engine/render.js";
import { buildDocx, coverSlots } from "../src/engine/docx.js";

const lib = JSON.parse(fs.readFileSync(new URL("../src/engine/seed/library.json", import.meta.url), "utf8"));
const ex = JSON.parse(fs.readFileSync(new URL("../src/engine/seed/example.json", import.meta.url), "utf8"));

test("seeded library is valid", () => {
  const v = validateLibrary(lib);
  assert.deepEqual(v.errors, []);
  assert.equal(lib.templates.length, 12);
  assert.equal(lib.themes.length, 8);
  assert.equal(lib.covers.length, 5);
});

test("every template builds a Word file and a cover", async () => {
  const L = makeLib(lib);
  for (const t of lib.templates) {
    const R = structuredClone(ex);
    Object.assign(R, { templateId: t.id, theme: t.theme, cover: t.cover, font: t.font, style: t.style });
    R.meta.abbr = t.abbr; R.meta.docType = t.docType;
    const buf = await docx.Packer.toBuffer(buildDocx(L, R, { images: {}, coverSlots: {}, logo: null }, docx, DC));
    assert.ok(buf.length > 10000, `${t.id} docx too small`);
    assert.match(RD.thumb(L, t), /class="cover"/);
  }
});

test("every cover lists photo slots that fit the page", () => {
  for (const c of lib.covers) for (const s of coverSlots(c)) { assert.ok(s.w > 0 && s.h > 0 && s.w <= 800 && s.h <= 1130, `${c.id} ${s.key}`); }
});

test("validation catches a broken cover", () => {
  const bad = structuredClone(lib); bad.covers[0].rows[0].cells[0].w = 60;
  assert.ok(validateLibrary(bad).errors.some(e => e.includes("add up to 100")));
});

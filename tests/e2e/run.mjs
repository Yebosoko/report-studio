/* End-to-end walk-through in local mode with AI_MOCK=1. Start the app first (see README "Testing"), then:
   BASE=http://localhost:3100 node tests/e2e/run.mjs [screenshot-dir] */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3100";
const SHOTS = process.argv[2] || null; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const log = (...a) => console.log("✓", ...a);
const errors = [];

const browser = await chromium.launch();
async function newUser(email, name) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(`${email}: ${e.message}`));
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", name); await page.fill("#email", email); await page.fill("#password", "correct-horse-1");
  await page.check('input[name="terms"]'); await page.click('button:has-text("Create account")');
  await page.waitForURL(/\/dashboard/);
  return { ctx, page };
}

// Member
const m = await newUser("member@example.com", "Ada Member");
await shot(m.page, "01-dashboard-empty");
assert.equal(await m.page.locator('nav[aria-label="Main"] >> text=Admin').count(), 0, "member sees no Admin tab");
log("member signed up; no Admin tab");
let r = await m.page.goto(`${BASE}/admin`); assert.equal(r.status(), 404); log("member gets 404 on /admin");
r = await m.page.request.get(`${BASE}/api/admin/lab`); assert.equal(r.status(), 404); log("member gets 404 on /api/admin/lab");
r = await m.page.request.post(`${BASE}/api/ai/structure`, { data: { draft: "x", templateId: "esia", sections: [{ title: "A" }] } }); assert.equal(r.status(), 404); log("member AI route is 404 while plan has AI off");

await m.page.goto(`${BASE}/library?pick=1`); await shot(m.page, "02-library");
await m.page.click('button:has-text("Environmental & Social Impact Assessment")');
await shot(m.page, "03-template-detail");
await m.page.click('button:has-text("Start a report with this")');
await m.page.waitForURL(/\/reports\//); await m.page.waitForSelector(".rs-desk .cover");
assert.equal(await m.page.locator("#ed-structure").count(), 0, "no Structure with AI for member");
log("report created from template; editor mounted; no AI button");
await m.page.fill("#ed-m-title", "Lekki Coastal Road ESIA");
await m.page.fill("#ed-m-client", "Lagos State Ministry of Environment");
await m.page.click('.rs-sw[title="Laterite"]');
await m.page.locator('.chapter').first().locator('[data-add="stats"]').click();
await m.page.locator('.chapter').first().locator('[data-add="table"]').click();
await m.page.locator('.chapter').first().locator('[data-add="chart"]').click();
await m.page.waitForTimeout(1800);
await m.page.waitForSelector('text=All changes saved');
log("edits autosaved");
await shot(m.page, "04-editor");
await m.page.click('button:has-text("Download Word")');
const [dl] = await Promise.all([m.page.waitForEvent("download"), m.page.click('.rs-modal button:has-text("Download")')]);
const file = await dl.path(); const size = fs.statSync(file).size; assert.ok(size > 10000, "docx size"); assert.match(dl.suggestedFilename(), /Lekki-Coastal-Road-ESIA\.docx/);
log(`Word export downloaded (${dl.suggestedFilename()}, ${Math.round(size / 1024)} KB)`);
await m.page.waitForSelector("text=has downloaded"); await shot(m.page, "05-export-done");
await m.page.click('.rs-modal button:has-text("Done")');
await m.page.reload(); await m.page.waitForSelector(".rs-desk .cover");
assert.equal(await m.page.inputValue("#ed-m-title"), "Lekki Coastal Road ESIA"); log("report reloads with saved edits");
const reportUrl = m.page.url();

// Owner
const o = await newUser("owner@example.com", "Steve Owner");
assert.equal(await o.page.locator('nav[aria-label="Main"] >> text=Admin').count(), 1); log("owner sees Admin tab");
r = await o.page.request.get(reportUrl.replace(BASE, `${BASE}`)); assert.equal(r.status(), 404, "owner can't open member's report"); log("owner cannot open a member's report");
await o.page.goto(`${BASE}/admin`); await o.page.waitForSelector("text=Admin overview"); await shot(o.page, "06-admin-overview");
await o.page.goto(`${BASE}/admin/lab`);
await o.page.fill("#lab-msg", "Create a forest colour theme");
await o.page.click('button:has-text("Send")');
await o.page.waitForSelector("text=Mock Forest", { timeout: 30000 });
await o.page.waitForSelector('button:has-text("Apply changes")');
await shot(o.page, "07-studio-lab");
log("Studio Lab (mock) made a pending change");
await o.page.goto(`${BASE}/admin/changes`); await shot(o.page, "08-changes");
await o.page.click('button:has-text("Approve and publish")');
await o.page.waitForSelector("text=Nothing pending");
log("change applied");
await m.page.goto(`${BASE}/library`); assert.ok(await m.page.locator("text=Mock Forest").count() > 0, "member sees new theme after reload"); log("member sees the published theme after reload");
await o.page.goto(`${BASE}/admin/changes`);
await o.page.locator('button:has-text("Roll back to before this")').first().click();
await o.page.click('.rs-modal button:has-text("Roll back")'); await o.page.waitForTimeout(1500);
await m.page.goto(`${BASE}/library`); assert.equal(await m.page.locator("text=Mock Forest").count(), 0, "rollback removed theme"); log("rollback removed it for members");

// Turn member AI on for Starter
await o.page.goto(`${BASE}/admin/users`); await o.page.click('role=tab[name="plans"]');
await o.page.locator('section[aria-label="Starter"] input[role="switch"]').check(); await o.page.waitForTimeout(1200);
await shot(o.page, "09-plans");
await m.page.goto(reportUrl); await m.page.waitForSelector("#ed-structure"); log("Structure with AI appears once the plan allows it");
await m.page.fill("#ed-draft", "Draft text: 1,240 PAPs along 18.4 km.");
await m.page.click("#ed-structure"); await m.page.click('.rs-modal button:has-text("Rebuild report")');
await m.page.waitForSelector("text=sections structured", { timeout: 30000 });
log("Structure with AI (mock) filled the sections");
await o.page.goto(`${BASE}/admin/ai`); await shot(o.page, "10-ai-settings");
await o.page.goto(`${BASE}/admin/builder`); await shot(o.page, "11-builder");
await o.page.goto(`${BASE}/admin/samples`); await shot(o.page, "12-samples");

// Phone width and dark mode
const phone = await browser.newContext({ viewport: { width: 400, height: 860 }, colorScheme: "dark", storageState: await m.ctx.storageState() });
const pp = await phone.newPage();
for (const [path, name] of [["/dashboard", "13-phone-dashboard"], [new URL(reportUrl).pathname, "14-phone-editor"], ["/library", "15-phone-library"], ["/", "16-phone-landing"]]) {
  await pp.goto(BASE + path); await pp.waitForTimeout(800);
  const w = await pp.evaluate(() => document.documentElement.scrollWidth); assert.ok(w <= 401, `${path} scrolls sideways (${w}px)`);
  await shot(pp, name);
}
log("400px phone width, dark mode: no horizontal scrolling on dashboard, editor, library, landing");
const ownerPhone = await browser.newContext({ viewport: { width: 400, height: 860 }, storageState: await o.ctx.storageState() });
const op = await ownerPhone.newPage();
for (const p of ["/admin", "/admin/lab", "/admin/users", "/admin/changes"]) { await op.goto(BASE + p); await op.waitForTimeout(500); const w = await op.evaluate(() => document.documentElement.scrollWidth); assert.ok(w <= 401, `${p} scrolls sideways (${w}px)`); }
log("400px: admin pages don't scroll sideways");

await browser.close();
if (errors.length) { console.error("Page errors:\n" + errors.join("\n")); process.exit(1); }
console.log("All end-to-end checks passed.");

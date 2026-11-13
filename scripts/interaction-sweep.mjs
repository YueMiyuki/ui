#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL, BROWSER_TAG, checkServer, launchBrowser } from "./lib/browser.mjs";

const USAGE = `Usage: node scripts/interaction-sweep.mjs [slug ...] [--jobs 4] [--theme light] [--settle 1200]

Loads every demo, sweeps the pointer across it, rests, presses up to two of its buttons,
and records slow frames and content that blinks out while the pointer moves.
Writes .shots/interaction-sweep.json and prints the worst pages.

Chrome is the default. MIYUKI_BROWSER=firefox or webkit runs another engine and adds its
name to the file. Firefox is worth a run of its own: it redraws filtered SVG pictures far
more slowly than Chrome, so a stall can show there and nowhere else. Headless Firefox
composites in software, which inflates small numbers; MIYUKI_HEADED=1 opens a window and
gives real ones (use --jobs 1 with it).

  --settle milliseconds to wait after load before measuring (default 1200); give
           Firefox 3500 so the demo pictures have been converted to bitmaps

  slow     frames over 50 ms while interacting
  worst    the longest frame, in ms
  blinks   times a visible element inside the demo dropped to opacity 0 and came back
           within 400 ms while the pointer was moving. Blinks during the button
           presses are listed under "pressBlinks" in the JSON and are usually a
           deliberate cross-fade.
  where    the first elements that blinked, in the JSON
  errors   uncaught errors and console errors (React's development warnings
           arrive that way), first one printed, all in the JSON`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const jobs = Number(flag("--jobs", "4"));
const theme = flag("--theme", "light");
const settle = Number(flag("--settle", "1200"));
const only = args.filter((a, i) => !a.startsWith("--") && !["--jobs", "--theme", "--settle"].includes(args[i - 1]));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry.json"), "utf8"));
const itemsDir = path.join(ROOT, "src", "registry", "items");
const targets = [];
for (const slug of fs.readdirSync(itemsDir).sort()) {
  if (only.length > 0 && !only.includes(slug)) continue;
  const metaPath = path.join(itemsDir, slug, "meta.json");
  if (!fs.existsSync(metaPath)) continue;
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const demos = meta.demos?.map((d) => d.name) ?? ["default"];
  for (const demo of demos) targets.push({ slug, demo });
}
if (targets.length === 0) {
  console.error(`No demos matched. ${registry.items?.length ?? 0} items are registered.`);
  process.exit(1);
}

await checkServer();
const browser = await launchBrowser();
const results = [];
let next = 0;

async function probe(page, target) {
  const url = `${BASE_URL}/preview/${target.slug}/${target.demo}?theme=${theme}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("[data-preview]", { timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(settle);
  await page.evaluate(() => {
    const state = (window.__sweep = { frames: [], blinks: 0, pressBlinks: 0, where: [], phase: "move", on: true });
    const name = (el) =>
      `${state.phase}: <${el.tagName.toLowerCase()}> ${String(el.getAttribute("class") ?? "").slice(0, 70)}`;
    let last = performance.now();
    const root = document.querySelector("[data-preview]");
    const watched = [...root.querySelectorAll("*")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.width * r.height > 900 &&
          getComputedStyle(el).opacity === "1" &&
          getComputedStyle(el).visibility === "visible"
        );
      })
      .slice(0, 400);
    const gone = new Map();
    const tick = (t) => {
      state.frames.push(t - last);
      last = t;
      for (const el of watched) {
        const cs = getComputedStyle(el);
        const hidden = cs.opacity === "0" || cs.visibility === "hidden";
        if (hidden && !gone.has(el)) gone.set(el, t);
        if (!hidden && gone.has(el)) {
          if (t - gone.get(el) < 400) {
            if (state.phase === "move") state.blinks++;
            else state.pressBlinks++;
            if (state.where.length < 4) state.where.push(name(el));
          }
          gone.delete(el);
        }
      }
      if (state.on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const box = await page.locator("[data-preview]").first().boundingBox();
  const view = page.viewportSize();
  const w = Math.min(box.width, view.width);
  const h = Math.min(box.height, view.height);
  await page.evaluate(() => {
    window.__sweep.frames.length = 0;
  });
  for (let pass = 0; pass < 2; pass++) {
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const v = pass === 0 ? 0.3 + 0.4 * Math.abs(Math.sin(u * Math.PI * 3)) : 0.7 - 0.4 * u;
      await page.mouse.move(box.x + w * (0.06 + 0.88 * u), box.y + h * v, { steps: 2 });
      await page.waitForTimeout(24);
    }
  }
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    window.__sweep.phase = "press";
  });
  const buttons = page.locator("[data-preview] button:not([disabled]), [data-preview] [role=button]");
  const count = Math.min(2, await buttons.count());
  for (let i = 0; i < count; i++) {
    await buttons
      .nth(i)
      .click({ timeout: 1500, trial: false })
      .catch(() => {});
    await page.waitForTimeout(450);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(150);
  }
  return page.evaluate(() => {
    const s = window.__sweep;
    s.on = false;
    const f = s.frames.slice(1);
    return {
      slow: f.filter((v) => v > 50).length,
      worst: Math.round(Math.max(0, ...f)),
      blinks: s.blinks,
      pressBlinks: s.pressBlinks,
      where: s.where,
      frames: f.length,
    };
  });
}

async function worker() {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, colorScheme: theme });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (/Failed to load resource|favicon|net::ERR_/.test(text)) return;
    errors.push(`console: ${text.replace(/\s+/g, " ").slice(0, 160)}`);
  });
  while (next < targets.length) {
    const target = targets[next++];
    errors.length = 0;
    try {
      const r = await probe(page, target);
      results.push({ ...target, ...r, errors: [...errors] });
    } catch (e) {
      results.push({ ...target, failed: String(e.message ?? e).slice(0, 120) });
    }
    if (results.length % 40 === 0) console.log(`${results.length}/${targets.length}`);
  }
  await context.close();
}

await Promise.all(Array.from({ length: jobs }, worker));
await browser.close();

results.sort((a, b) => (b.blinks ?? 0) * 1000 + (b.worst ?? 0) - ((a.blinks ?? 0) * 1000 + (a.worst ?? 0)));
const out = path.join(
  ROOT,
  ".shots",
  `interaction-sweep${BROWSER_TAG ? `.${BROWSER_TAG}` : ""}${only.length > 0 ? ".partial" : ""}.json`,
);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
const flagged = results.filter((r) => r.failed || r.blinks > 0 || r.slow > 0 || r.errors?.length);
console.log(
  `\n${targets.length} demos swept, ${flagged.length} flagged. Full results: ${path.relative(process.cwd(), out)}\n`,
);
for (const r of flagged.slice(0, 60)) {
  const name = `${r.slug}${r.demo === "default" ? "" : `:${r.demo}`}`.padEnd(34);
  console.log(
    r.failed
      ? `${name} failed: ${r.failed}`
      : `${name} blinks ${String(r.blinks).padStart(2)}  slow ${String(r.slow).padStart(2)}  worst ${String(r.worst).padStart(4)} ms${r.errors.length ? `  error: ${r.errors[0]}` : ""}`,
  );
}

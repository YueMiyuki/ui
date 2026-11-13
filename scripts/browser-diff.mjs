#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BASE_URL, capture, checkServer, contextOptions, launchBrowser, watchPage } from "./lib/browser.mjs";
import { readItems } from "./lib/items.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots", "browsers");
const RESULTS = path.join(OUT, "results.json");
const REPORT = path.join(OUT, "report.txt");

const HELP = `Usage: node scripts/browser-diff.mjs [<slug>[:<demo>] ...] [options]

Loads every demo (or the ones named) at ${BASE_URL}/preview/<slug>/<demo>
in headless Chrome and in WebKit, in both themes, waits for it to settle,
records page and console errors per browser, saves both screenshots and scores
how different they are. The score is the mean colour difference of the two
shots shrunk to 64x45, in percent: good for ranking, not for pixel equality,
since animations never line up.

Options
  --jobs 3          pages compared at once; each opens a Chrome and a WebKit tab
  --size 1000x700   viewport
  --wait 1500       ms to wait after load, network idle and fonts
  --theme both      light, dark or both
  --composited      take WebKit shots from a video frame: slower, but shows 3D
                    transforms and backdrop-filter, which WebKit screenshots drop
  --resume          keep earlier results for pages whose two shots exist
  --sheets 80       after the sweep, contact sheets for every page with an error
                    in WebKit only and for the 80 most different pages; a range
                    such as 81-160 makes sheets for those ranks; 0 for none
  --sheets-only     rebuild the report and sheets from results.json, no shooting
  --help            show this text

Output, in .shots/browsers/
  <slug>.<demo>.<theme>.chrome.png and .webkit.png
  results.json            every page with its score and errors per browser
  report.txt              pages sorted by difference, then errors per browser
  errors-NN.png           sheets for pages with WebKit-only errors
  diff-<from>-<to>.png    sheets by rank; Chrome left, WebKit right, four rows

WebKit comes from Playwright: pnpm exec playwright install webkit
Env: MIYUKI_URL (default http://localhost:3210).

Examples
  node scripts/browser-diff.mjs
  node scripts/browser-diff.mjs --resume --sheets 81-160 --sheets-only
  node scripts/browser-diff.mjs ridge-plot switch:sizes --theme dark --sheets 10`;

function fail(message) {
  console.error(`browser-diff: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    targets: [],
    jobs: 3,
    size: "1000x700",
    wait: 1500,
    theme: "both",
    resume: false,
    composited: false,
    sheets: "80",
    sheetsOnly: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) fail(`${arg} needs a value. See --help.`);
      return v;
    };
    if (arg === "--help" || arg === "-h") {
      console.log(HELP);
      process.exit(0);
    } else if (arg === "--jobs") opts.jobs = Number(value());
    else if (arg === "--size") opts.size = value();
    else if (arg === "--wait") opts.wait = Number(value());
    else if (arg === "--theme") opts.theme = value();
    else if (arg === "--resume") opts.resume = true;
    else if (arg === "--composited") opts.composited = true;
    else if (arg === "--sheets") opts.sheets = value();
    else if (arg === "--sheets-only") opts.sheetsOnly = true;
    else if (arg.startsWith("--")) fail(`Unknown option ${arg}. See --help.`);
    else opts.targets.push(arg);
  }
  const size = opts.size.match(/^(\d+)x(\d+)$/);
  if (!size) fail("--size must look like 1000x700");
  opts.viewport = { width: Number(size[1]), height: Number(size[2]) };
  if (!(opts.jobs >= 1)) fail("--jobs must be 1 or more");
  if (!["light", "dark", "both"].includes(opts.theme)) fail("--theme must be light, dark or both");
  const range = opts.sheets.match(/^(\d+)(?:-(\d+))?$/);
  if (!range) fail("--sheets must be a count such as 80 or a range such as 81-160");
  opts.sheetRange = range[2] ? [Number(range[1]), Number(range[2])] : [1, Number(range[1])];
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
fs.mkdirSync(OUT, { recursive: true });

const pageKey = (p) => `${p.slug}:${p.demo}:${p.theme}`;
const shotPath = (p, browser) => path.join(OUT, `${p.slug}.${p.demo}.${p.theme}.${browser}.png`);

function loadResults() {
  try {
    return JSON.parse(fs.readFileSync(RESULTS, "utf8"));
  } catch {
    return {};
  }
}

let results = loadResults();
if (!opts.resume && !opts.sheetsOnly && opts.targets.length === 0) results = {};

function saveResults() {
  fs.writeFileSync(RESULTS, JSON.stringify(results, null, 1));
}

async function shrink(file) {
  return sharp(file).resize(64, 45, { fit: "fill", kernel: "cubic" }).removeAlpha().raw().toBuffer();
}

async function score(a, b) {
  const [x, y] = await Promise.all([shrink(a), shrink(b)]);
  let sum = 0;
  let cells = 0;
  for (let i = 0; i < x.length; i += 3) {
    const d = Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]);
    sum += d;
    if (d > 90) cells++;
  }
  return { diff: +((sum / (x.length * 255)) * 100).toFixed(2), area: +((cells / (x.length / 3)) * 100).toFixed(1) };
}

async function isBlank(file) {
  const { channels } = await sharp(file).stats();
  return channels.slice(0, 3).every((c) => c.stdev < 0.5);
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page
    .evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    .catch(() => {});
}

async function shoot(browser, name, p) {
  const file = shotPath(p, name);
  const url = `${BASE_URL}/preview/${p.slug}/${p.demo}?theme=${p.theme}`;
  let last = { errors: [], blank: false };
  for (let attempt = 0; attempt < 3; attempt++) {
    const composited = opts.composited && name === "webkit";
    const context = await browser.newContext(
      contextOptions({ viewport: opts.viewport, colorScheme: p.theme, deviceScaleFactor: 1 }, composited),
    );
    const page = await context.newPage();
    const seen = watchPage(page);
    try {
      await page.goto(url, { waitUntil: "load", timeout: 120_000 });
      await page.waitForSelector("[data-preview]", { timeout: 30_000 });
      await settle(page);
      await page.waitForTimeout(opts.wait * (attempt + 1));
      const crashed = page.locator('[role="alert"]').filter({ hasText: "This demo could not run" }).first();
      if (await crashed.count())
        seen.errors.push(`demo crashed: ${(await crashed.innerText()).replace(/\s+/g, " ").slice(0, 300)}`);
      if (composited) await capture(page, file, true);
      else await page.screenshot({ path: file, timeout: 30_000 });
      const blank = await isBlank(file);
      last = { errors: [...seen.errors], blank };
      if (!blank) break;
    } catch (error) {
      last = { errors: [...seen.errors, `load: ${error.message.split("\n")[0]}`], blank: true, failed: true };
    } finally {
      await context.close().catch(() => {});
    }
  }
  return last;
}

async function sweep(pages) {
  await checkServer();
  const [chrome, webkit] = await Promise.all([launchBrowser("chrome"), launchBrowser("webkit")]);
  let done = 0;
  const started = Date.now();
  const queue = [...pages];
  async function worker() {
    for (let p = queue.shift(); p; p = queue.shift()) {
      const [c, w] = await Promise.all([shoot(chrome, "chrome", p), shoot(webkit, "webkit", p)]);
      const both = fs.existsSync(shotPath(p, "chrome")) && fs.existsSync(shotPath(p, "webkit"));
      const s = both ? await score(shotPath(p, "chrome"), shotPath(p, "webkit")) : { diff: null, area: null };
      results[pageKey(p)] = { ...p, ...s, chrome: c, webkit: w };
      saveResults();
      done++;
      const flag = w.errors.length && !c.errors.length ? "  WEBKIT-ONLY ERRORS" : "";
      const eta = (((Date.now() - started) / done) * (pages.length - done)) / 60000;
      console.log(
        `[${done}/${pages.length} ~${eta.toFixed(0)}m] ${pageKey(p)} diff ${s.diff} c${c.errors.length} w${w.errors.length}${c.blank || w.blank ? " BLANK" : ""}${flag}`,
      );
    }
  }
  try {
    await Promise.all(Array.from({ length: opts.jobs }, worker));
  } finally {
    await Promise.all([chrome.close(), webkit.close()]);
  }
}

function ranked() {
  return Object.values(results)
    .filter((r) => r.diff !== null)
    .sort((a, b) => b.diff - a.diff);
}

const webkitOnly = (r) => r.webkit.errors.length > 0 && r.chrome.errors.length === 0;

function writeReport() {
  const rows = ranked();
  const lines = [];
  const pad = (s, n) => String(s).padEnd(n);
  lines.push(
    `${pad("rank", 5)}${pad("page", 52)}${pad("diff%", 7)}${pad("area%", 7)}${pad("errC", 5)}${pad("errW", 5)}flags`,
  );
  rows.forEach((r, i) => {
    const flags = [
      r.chrome.blank && "blank-chrome",
      r.webkit.blank && "blank-webkit",
      webkitOnly(r) && "webkit-only-errors",
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(
      `${pad(i + 1, 5)}${pad(pageKey(r), 52)}${pad(r.diff, 7)}${pad(r.area, 7)}${pad(r.chrome.errors.length, 5)}${pad(r.webkit.errors.length, 5)}${flags}`,
    );
  });
  const missing = Object.values(results).filter((r) => r.diff === null);
  if (missing.length) {
    lines.push("", "Pages without both shots");
    for (const r of missing)
      lines.push(`  ${pageKey(r)}  chrome: ${r.chrome.errors.join(" | ")}  webkit: ${r.webkit.errors.join(" | ")}`);
  }
  const only = Object.values(results).filter(webkitOnly);
  lines.push("", `Errors in WebKit only (${only.length} pages)`);
  for (const r of only) {
    lines.push(`  ${pageKey(r)}`);
    for (const e of [...new Set(r.webkit.errors)]) lines.push(`    ${e}`);
  }
  const shared = Object.values(results).filter((r) => r.chrome.errors.length > 0);
  lines.push("", `Errors in Chrome (${shared.length} pages)`);
  for (const r of shared) {
    lines.push(`  ${pageKey(r)}`);
    for (const e of [...new Set(r.chrome.errors)]) lines.push(`    chrome  ${e}`);
    for (const e of [...new Set(r.webkit.errors)]) lines.push(`    webkit  ${e}`);
  }
  fs.writeFileSync(REPORT, `${lines.join("\n")}\n`);
  return { rows, only };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sheet(rows, file) {
  const half = 500;
  const h = Math.round((half * opts.viewport.height) / opts.viewport.width);
  const label = 30;
  const rowH = h + label;
  const layers = [];
  for (const [i, r] of rows.entries()) {
    const top = i * rowH;
    const note = r.webkit.errors.length && !r.chrome.errors.length ? `  WebKit: ${r.webkit.errors[0]}` : "";
    const text = `#${r.rank ?? "-"}  ${pageKey(r)}  diff ${r.diff}  area ${r.area}${note}`.slice(0, 160);
    layers.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${half * 2}" height="${label}"><rect width="100%" height="100%" fill="#1d2433"/><text x="8" y="20" font-family="Menlo, monospace" font-size="13" fill="#f2f5fa">${esc(text)}</text></svg>`,
      ),
      top,
      left: 0,
    });
    for (const [j, name] of ["chrome", "webkit"].entries()) {
      const src = shotPath(r, name);
      if (!fs.existsSync(src)) continue;
      layers.push({
        input: await sharp(src).resize(half, h, { fit: "fill" }).toBuffer(),
        top: top + label,
        left: j * half,
      });
    }
    layers.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="${h}"><rect width="2" height="${h}" fill="#e0245e"/></svg>`,
      ),
      top: top + label,
      left: half - 1,
    });
  }
  await sharp({ create: { width: half * 2, height: rows.length * rowH, channels: 3, background: "#0c1018" } })
    .composite(layers)
    .png()
    .toFile(file);
  console.log(path.relative(process.cwd(), file));
}

async function sheets(rows, only) {
  if (opts.sheetRange[1] === 0) return;
  rows.forEach((r, i) => (r.rank = i + 1));
  const [from, to] = opts.sheetRange;
  if (from === 1) {
    for (let i = 0; i < only.length; i += 4)
      await sheet(only.slice(i, i + 4), path.join(OUT, `errors-${String(i / 4 + 1).padStart(2, "0")}.png`));
  }
  const pick = rows.slice(from - 1, to);
  for (let i = 0; i < pick.length; i += 4) {
    const a = from + i;
    const b = Math.min(a + 3, to, from + pick.length - 1);
    await sheet(
      pick.slice(i, i + 4),
      path.join(OUT, `diff-${String(a).padStart(3, "0")}-${String(b).padStart(3, "0")}.png`),
    );
  }
}

if (!opts.sheetsOnly) {
  const items = readItems();
  if (!items) fail("src/registry/__generated__/items.ts is missing. Run pnpm registry.");
  const themes = opts.theme === "both" ? ["light", "dark"] : [opts.theme];
  let targets;
  if (opts.targets.length) {
    const bySlug = new Map(items.map((item) => [item.slug, item]));
    targets = opts.targets.flatMap((t) => {
      const [slug, demo] = t.split(":");
      const item = bySlug.get(slug);
      if (!item) {
        console.error(`  ! ${slug} is not in the registry`);
        return [];
      }
      return demo ? [{ slug, demo }] : item.demos.map((d) => ({ slug, demo: d.name }));
    });
  } else {
    targets = items.flatMap((item) => item.demos.map((d) => ({ slug: item.slug, demo: d.name })));
  }
  const pages = targets
    .flatMap((t) => themes.map((theme) => ({ ...t, theme })))
    .filter(
      (p) =>
        !(
          opts.resume &&
          results[pageKey(p)] &&
          fs.existsSync(shotPath(p, "chrome")) &&
          fs.existsSync(shotPath(p, "webkit"))
        ),
    );
  console.log(`Comparing ${pages.length} pages in Chrome and WebKit, ${opts.jobs} at a time.`);
  await sweep(pages);
}

const { rows, only } = writeReport();
console.log(`\n${rows.length} pages scored. Most different:`);
for (const r of rows.slice(0, 25)) console.log(`  ${String(r.diff).padStart(6)}  ${pageKey(r)}`);
console.log(`\nErrors in WebKit only: ${only.length} pages`);
for (const r of only) console.log(`  ${pageKey(r)}  ${r.webkit.errors[0]}`);
console.log(`\nFull table: ${path.relative(process.cwd(), REPORT)}`);
await sheets(rows, only);

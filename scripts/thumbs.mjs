#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BASE_URL, checkServer, launchBrowser, watchPage } from "./lib/browser.mjs";
import { readItems } from "./lib/items.mjs";
import { THUMB_THEMES, THUMBS_DIR, THUMBS_MODULE, thumbPath, writeThumbsModule } from "./lib/thumbs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const WIDTH = 720;
const HEIGHT = 450;
const CLICK_WAIT = 500;

const HELP = `Usage: node scripts/thumbs.mjs [<slug> ...] [options]   (or pnpm thumbs)

Renders each item's first demo the way its gallery tile shows it, through
${BASE_URL}/thumb/<slug>, and saves public/thumbs/<slug>.light.webp and
<slug>.dark.webp at ${WIDTH}x${HEIGHT}. Then rewrites ${path.relative(ROOT, THUMBS_MODULE)},
which tells the tiles which pictures exist. With no slugs it renders every item.

An item's meta.json can ask for more: preview.settle (milliseconds) waits that long
instead of --settle when it is longer, for slow entrances; preview.thumbClick (a CSS
selector or a list of them) is clicked in order, ${CLICK_WAIT}ms apart, before the wait, so an
overlay is photographed open. Such items are rendered in a viewport the size of the tile,
so overlays fixed to the window land inside the picture.

Options
  --missing          only items with no picture, or whose component, first demo or
                     meta.json is newer than the picture
  --theme <t>        light, dark or both (default both)
  --settle <ms>      time to let entrances finish after fonts and network (default 2000;
                     an item's preview.settle wins when it is longer)
  --jobs <n>         pages rendered at once (default 4)
  --help             show this text

Env: MIYUKI_URL (default http://localhost:3210).

Examples
  node scripts/thumbs.mjs northern-lights
  node scripts/thumbs.mjs --missing
  node scripts/thumbs.mjs typed-phrases --settle 5000`;

function fail(message) {
  console.error(`thumbs: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { slugs: [], missing: false, theme: "both", settle: 2000, jobs: 4 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) fail(`${arg} needs a value. See --help.`);
      return v;
    };
    switch (arg) {
      case "--help":
      case "-h":
        console.log(HELP);
        process.exit(0);
        break;
      case "--missing":
        opts.missing = true;
        break;
      case "--theme":
        opts.theme = value();
        break;
      case "--settle":
        opts.settle = Number(value());
        break;
      case "--jobs":
        opts.jobs = Number(value());
        break;
      default:
        if (arg.startsWith("--")) fail(`Unknown option ${arg}. See --help.`);
        opts.slugs.push(...arg.split(",").filter(Boolean));
    }
  }
  if (!["light", "dark", "both"].includes(opts.theme)) fail("--theme must be light, dark or both");
  if (!Number.isFinite(opts.settle) || opts.settle < 0) fail("--settle must be a number of milliseconds");
  if (!Number.isInteger(opts.jobs) || opts.jobs < 1) fail("--jobs must be a whole number above 0");
  return opts;
}

const mtime = (abs) => {
  try {
    return fs.statSync(abs).mtimeMs;
  } catch {
    return 0;
  }
};

function sourcesChanged(item) {
  const demo = item.demos[0];
  const files = [
    ...item.files.map((file) => path.join(SRC, file)),
    ...(demo ? [path.join(SRC, demo.file)] : []),
    path.join(SRC, "registry", "items", item.slug, "meta.json"),
  ];
  return Math.max(...files.map(mtime));
}

function isStale(item, theme) {
  const picture = mtime(thumbPath(item.slug, theme));
  return picture === 0 || sourcesChanged(item) > picture;
}

const list = (names, max = 12) =>
  names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;
const minutes = (ms) =>
  ms < 60_000 ? seconds(ms) : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;

async function documentSettled(target) {
  await target.evaluate(async () => {
    await document.fonts.ready;
    const pending = [...document.images].filter((img) => !img.complete);
    await Promise.race([
      Promise.all(pending.map((img) => img.decode().catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
  });
}

async function crashText(target) {
  const boundary = target.locator('[role="alert"]').filter({ hasText: "This demo could not run" }).first();
  return (await boundary.count()) ? (await boundary.innerText()).replace(/\s+/g, " ") : null;
}

async function capture(browser, item, theme, settle) {
  const iframe = item.preview.iframe;
  const clicks = item.preview.thumbClick == null ? [] : [].concat(item.preview.thumbClick);
  const tile = iframe ? { width: WIDTH * 2, height: HEIGHT * 2 } : { width: WIDTH, height: HEIGHT };
  const context = await browser.newContext({
    viewport: clicks.length ? tile : { width: WIDTH * 2, height: HEIGHT * 2 },
    deviceScaleFactor: iframe ? 1 : 2,
    colorScheme: theme,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const seen = watchPage(page);
  try {
    const response = await page.goto(`${BASE_URL}/thumb/${item.slug}`, { waitUntil: "load", timeout: 90_000 });
    if (response && response.status() === 404) throw new Error("404 at /thumb (run pnpm registry?)");
    await page.locator("[data-thumb-frame]").waitFor({ state: "attached", timeout: 30_000 });

    let target = page;
    if (iframe) {
      const handle = await page.locator("[data-thumb-frame] iframe").elementHandle({ timeout: 30_000 });
      target = await handle.contentFrame();
      if (!target) throw new Error("the preview iframe has no document");
      await target.waitForLoadState("load", { timeout: 90_000 });
    }

    try {
      await target.locator("[data-demo-ready]").waitFor({ state: "attached", timeout: 60_000 });
    } catch {
      throw new Error((await crashText(target)) ?? "the demo never rendered (60s)");
    }

    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await documentSettled(page);
    if (iframe) await documentSettled(target);
    if (clicks.length) {
      await page.evaluate(() => {
        const frame = document.querySelector("[data-thumb-frame]");
        frame?.removeAttribute("inert");
        frame?.classList.remove("pointer-events-none");
      });
      for (const selector of clicks) {
        const element = target.locator(selector).first();
        try {
          await element.waitFor({ state: "attached", timeout: 10_000 });
        } catch {
          throw new Error(`preview.thumbClick: nothing matches ${selector}`);
        }
        await element.evaluate((node) => node.click());
        await page.waitForTimeout(CLICK_WAIT);
      }
    }
    await page.waitForTimeout(settle);

    const crashed = await crashText(target);
    if (crashed) throw new Error(crashed);
    const dark = await target.evaluate(() => document.documentElement.classList.contains("dark"));
    if (dark !== (theme === "dark")) throw new Error(`rendered in the ${dark ? "dark" : "light"} theme`);

    const png = await page.screenshot({
      clip: { x: 0, y: 0, ...(iframe ? { width: WIDTH * 2, height: HEIGHT * 2 } : { width: WIDTH, height: HEIGHT }) },
    });
    const image = sharp(png).resize(WIDTH, HEIGHT, { kernel: "lanczos3" });
    const { channels } = await sharp(png).stats();
    const spread = Math.max(...channels.slice(0, 3).map((c) => c.stdev));
    const file = thumbPath(item.slug, theme);
    const tmp = `${file}.${process.pid}.tmp`;
    await image.webp({ quality: 80, effort: 5, smartSubsample: true }).toFile(tmp);
    fs.renameSync(tmp, file);
    return { errors: seen.errors, blank: spread < 1.5 };
  } finally {
    await context.close().catch(() => {});
  }
}

const opts = parseArgs(process.argv.slice(2));
const catalogue = readItems();
if (!catalogue) fail("src/registry/__generated__/items.ts is missing. Run pnpm registry first.");
const bySlug = new Map(catalogue.map((item) => [item.slug, item]));

let selected = catalogue;
if (opts.slugs.length) {
  const unknown = opts.slugs.filter((slug) => !bySlug.has(slug));
  for (const slug of unknown)
    console.error(`✗ ${slug} is not in the registry. Is its meta.json valid? Run pnpm registry to see.`);
  selected = opts.slugs.filter((slug) => bySlug.has(slug)).map((slug) => bySlug.get(slug));
  if (selected.length === 0) process.exit(1);
}

const themes = opts.theme === "both" ? THUMB_THEMES : [opts.theme];
const jobs = selected.flatMap((item) =>
  themes.filter((theme) => !opts.missing || isStale(item, theme)).map((theme) => ({ item, theme })),
);

fs.mkdirSync(THUMBS_DIR, { recursive: true });

function finish() {
  const { versions } = writeThumbsModule(catalogue.map((item) => item.slug));
  const files = fs.readdirSync(THUMBS_DIR).filter((f) => f.endsWith(".webp"));
  const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(THUMBS_DIR, f)).size, 0);
  const without = catalogue.filter((item) => !versions[item.slug]).map((item) => item.slug);
  const orphans = [...new Set(files.map((f) => f.replace(/\.(light|dark)\.webp$/, "")))].filter((s) => !bySlug.has(s));
  console.log(
    `public/thumbs: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB. ` +
      `${Object.keys(versions).length} of ${catalogue.length} items have both pictures.`,
  );
  if (without.length) console.log(`  without a picture (the tile shows the placeholder): ${list(without)}`);
  if (orphans.length) console.log(`  pictures for slugs no longer in the registry: ${list(orphans)}`);
}

if (jobs.length === 0) {
  console.log(`thumbs: nothing to do; every picture is newer than its sources.`);
  finish();
  process.exit(0);
}

await checkServer();
const browser = await launchBrowser();
const started = Date.now();
const results = [];
let next = 0;
let interrupted = false;

process.on("SIGINT", () => {
  interrupted = true;
  console.log("\nthumbs: stopping after the pages in flight…");
});

console.log(
  `thumbs: ${jobs.length} picture${jobs.length === 1 ? "" : "s"} for ${new Set(jobs.map((j) => j.item.slug)).size} items, ` +
    `${opts.jobs} at a time, settle ${opts.settle}ms`,
);

async function worker() {
  while (!interrupted && next < jobs.length) {
    const job = jobs[next++];
    const t = Date.now();
    let result;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const settle = Math.max(opts.settle, job.item.preview.settle ?? 0);
        result = { ...job, ...(await capture(browser, job.item, job.theme, settle)), ok: true };
        break;
      } catch (error) {
        result = { ...job, ok: false, error: error.message.split("\n")[0], errors: [] };
        if (/never rendered|could not run|theme/.test(result.error)) break;
      }
    }
    result.ms = Date.now() - t;
    results.push(result);
    const label = `${job.item.slug} ${job.theme}`;
    const n = `[${results.length}/${jobs.length}]`;
    if (!result.ok) console.error(`${n} ✗ ${label}: ${result.error}`);
    else
      console.log(
        `${n} ✓ ${label} ${seconds(result.ms)}${result.blank ? "  (looks blank)" : ""}${result.errors.length ? `  (${result.errors.length} page error${result.errors.length === 1 ? "" : "s"})` : ""}`,
      );
  }
}

try {
  await Promise.all(Array.from({ length: Math.min(opts.jobs, jobs.length) }, worker));
} finally {
  await browser.close();
}

const ok = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
const blank = ok.filter((r) => r.blank);
const noisy = ok.filter((r) => r.errors.length);

console.log(
  `\nthumbs: ${ok.length} picture${ok.length === 1 ? "" : "s"} written, ${failed.length} failed` +
    `${interrupted ? `, ${jobs.length - results.length} not started` : ""} in ${minutes(Date.now() - started)}.`,
);
if (failed.length) {
  console.log(`  failed (the old picture, if any, is kept):`);
  for (const r of failed) console.log(`    ✗ ${r.item.slug} ${r.theme}: ${r.error}`);
}
if (blank.length) console.log(`  look blank, check them: ${blank.map((r) => `${r.item.slug} ${r.theme}`).join(", ")}`);
if (noisy.length) {
  console.log(`  page errors:`);
  for (const r of noisy) for (const e of [...new Set(r.errors)]) console.log(`    ${r.item.slug} ${r.theme}: ${e}`);
}
finish();
process.exit(failed.length ? 1 : 0);

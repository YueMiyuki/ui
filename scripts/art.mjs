#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ART_DIR, ART_MODULE, artHashes, artPath, writeArtModule } from "./lib/art.mjs";
import { BASE_URL, checkServer, launchBrowser } from "./lib/browser.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ITEMS_DIR = path.join(ROOT, "src", "registry", "items");
const THEMES = ["light", "dark"];
const SITE_PAGES = ["/", "/docs/components", "/docs/templates"];
const SCALE = 2;
const LONG_SIDE = 2400;
const QUALITY = 0.82;
const SETTLE = 1500;
const ATTEMPTS = 3;

const HELP = `Usage: node scripts/art.mjs [<slug> ...] [options]   (or pnpm art)

Renders the demo pictures from src/registry/lib/art.ts to WebP files once, so no
browser has to draw the filtered SVGs. Opens every demo of every item in Chrome, in
both themes (${BASE_URL}/preview/<slug>/<demo>?theme=light|dark), plus
${SITE_PAGES.join(", ")}, and collects every picture the page asks art.ts for, including
pictures for tabs and dialogs that are not open. Each picture is drawn into a canvas in
Chrome and saved as public/art/<hash>.webp, where the hash is taken from the SVG itself,
so a change to the generator gives new names and never serves an old file. Then rewrites
${path.relative(ROOT, ART_MODULE)}, which tells art.ts which pictures have a file.

Pictures are saved at twice their size, with the long side at most ${LONG_SIDE}px. A picture
is saved at its own size instead when some <img> showing it takes its size from the
picture, which the script tests on every page by giving the <img> a picture twice as
large and checking whether its box moves.

With no slugs every demo is visited and files for pictures no page uses any more are
deleted (unless a page failed). With slugs only those items are visited and files are
only added.

Options
  --jobs <n>   pages open at once (default 4)
  --force      redo pictures that already have a file
  --help       show this text

Env: MIYUKI_URL (default http://localhost:3210).

Examples
  node scripts/art.mjs
  node scripts/art.mjs crafted-cards tide-slideshow
  node scripts/art.mjs loupe --force`;

function fail(message) {
  console.error(`art: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { slugs: [], jobs: 4, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--help":
      case "-h":
        console.log(HELP);
        process.exit(0);
        break;
      case "--force":
        opts.force = true;
        break;
      case "--jobs": {
        const v = argv[++i];
        if (v === undefined) fail("--jobs needs a value. See --help.");
        opts.jobs = Number(v);
        break;
      }
      default:
        if (arg.startsWith("--")) fail(`Unknown option ${arg}. See --help.`);
        opts.slugs.push(...arg.split(",").filter(Boolean));
    }
  }
  if (!Number.isInteger(opts.jobs) || opts.jobs < 1) fail("--jobs must be a whole number above 0");
  return opts;
}

function demoTargets(only) {
  const targets = [];
  const known = new Set();
  for (const slug of fs.readdirSync(ITEMS_DIR).sort()) {
    const metaPath = path.join(ITEMS_DIR, slug, "meta.json");
    if (!fs.existsSync(metaPath)) continue;
    known.add(slug);
    if (only.length > 0 && !only.includes(slug)) continue;
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {
      console.error(`art: skipping ${slug}, its meta.json does not parse`);
      continue;
    }
    const demos = meta.demos?.map((d) => d.name) ?? ["default"];
    for (const demo of demos)
      for (const theme of THEMES)
        targets.push({ label: `${slug}:${demo}`, url: `/preview/${slug}/${demo}?theme=${theme}`, theme, demo: true });
  }
  const unknown = only.filter((slug) => !known.has(slug));
  if (unknown.length) fail(`no item called ${unknown.join(", ")} in src/registry/items`);
  return targets;
}

const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const minutes = (ms) =>
  ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;

function folderBytes() {
  return artHashes().reduce((sum, hash) => sum + fs.statSync(artPath(hash)).size, 0);
}

async function crashText(page) {
  const boundary = page.locator('[role="alert"]').filter({ hasText: "This demo could not run" }).first();
  return (await boundary.count()) ? (await boundary.innerText()).replace(/\s+/g, " ") : null;
}

async function measure(known) {
  const map = globalThis.__miyukiArt;
  if (!(map instanceof Map)) throw new Error("the page lost its picture list (it reloaded)");
  const skip = new Set(known);
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const ready = async (img) => {
    await Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))]);
    await frame();
    await frame();
  };
  const box = (img) => {
    const r = img.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height, img.offsetWidth, img.offsetHeight];
  };
  const differs = (a, b, from, to) => a.slice(from, to).some((v, i) => Math.abs(v - b[from + i]) > 0.5);
  const images = [...document.querySelectorAll("img")];
  const out = [];
  for (const [hash, uri] of map) {
    const size = uri.match(/width='(\d+)' height='(\d+)'/);
    const width = Number(size?.[1] ?? 0);
    const height = Number(size?.[2] ?? 0);
    const users = images.filter((img) => {
      const src = img.getAttribute("src");
      return src === uri || src === `/art/${hash}.webp`;
    });
    let moved = false;
    for (const img of users) {
      if (moved || !width || !height) break;
      const src = img.getAttribute("src");
      const loading = img.getAttribute("loading");
      if (loading === "lazy") img.loading = "eager";
      await ready(img);
      const before = box(img);
      img.setAttribute(
        "src",
        `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width * 2}' height='${height * 2}'/%3E`,
      );
      await ready(img);
      const big = box(img);
      img.setAttribute("src", src);
      await ready(img);
      const after = box(img);
      if (loading === null) img.removeAttribute("loading");
      else img.setAttribute("loading", loading);
      const still = !differs(before, after, 0, 4);
      moved = differs(before, big, 4, 6) || (still && differs(before, big, 0, 4));
    }
    out.push({ hash, uri: skip.has(hash) ? null : uri, width, height, moved });
  }
  return out;
}

async function visit(browser, target, known) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    colorScheme: target.theme,
  });
  await context.addInitScript(() => {
    globalThis.__miyukiArt = new Map();
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(`${BASE_URL}${target.url}`, { waitUntil: "load", timeout: 90_000 });
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
    if (target.demo) {
      try {
        await page.locator("[data-demo-ready]").waitFor({ state: "attached", timeout: 60_000 });
      } catch {
        throw new Error((await crashText(page)) ?? "the demo never rendered (60s)");
      }
    }
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(SETTLE);
    const crashed = target.demo ? await crashText(page) : null;
    if (crashed) throw new Error(crashed);
    return await page.evaluate(measure, [...known]);
  } finally {
    await context.close().catch(() => {});
  }
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function fileSize(width, height, scale) {
  const wanted = Math.max(1, Math.min(scale, LONG_SIDE / Math.max(width, height)));
  if (wanted === 1) return [width, height];
  const shared = gcd(width, height);
  const density = shared >= 8 ? Math.max(1, Math.round(wanted * shared) / shared) : Math.round(width * wanted) / width;
  return [Math.round(width * density), Math.round(height * density)];
}

async function render(job) {
  const image = new Image();
  image.src = job.uri;
  await image.decode();
  if (image.naturalWidth !== job.width || image.naturalHeight !== job.height)
    throw new Error(`the picture is ${image.naturalWidth}x${image.naturalHeight}, not ${job.width}x${job.height}`);
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = job.size;
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", job.quality));
  if (blob?.type !== "image/webp") throw new Error("Chrome did not encode WebP");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function sizeOnDisk(hash) {
  try {
    const { width, height } = await sharp(artPath(hash)).metadata();
    return [width, height];
  } catch {
    return null;
  }
}

const opts = parseArgs(process.argv.slice(2));
const full = opts.slugs.length === 0;
const targets = [
  ...demoTargets(opts.slugs),
  ...(full ? SITE_PAGES.flatMap((url) => THEMES.map((theme) => ({ label: url, url, theme, demo: false }))) : []),
];

fs.mkdirSync(ART_DIR, { recursive: true });
writeArtModule();

await checkServer();
const browser = await launchBrowser("chrome");
const started = Date.now();
const pictures = new Map();
const failed = [];
let visited = 0;
let next = 0;
let interrupted = false;

process.on("SIGINT", () => {
  interrupted = true;
  console.log("\nart: stopping after the pages in flight…");
});

console.log(
  `art: visiting ${targets.length} page${targets.length === 1 ? "" : "s"}, ${opts.jobs} at a time` +
    `${full ? "" : ` (${opts.slugs.join(", ")})`}`,
);

async function crawler() {
  while (!interrupted && next < targets.length) {
    const target = targets[next++];
    let error = null;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const found = await visit(browser, target, pictures.keys());
        for (const p of found) {
          let entry = pictures.get(p.hash);
          if (!entry) {
            if (p.uri === null) continue;
            entry = { uri: p.uri, width: p.width, height: p.height, pages: new Set(), moved: new Set() };
            pictures.set(p.hash, entry);
          }
          entry.pages.add(target.label);
          if (p.moved) entry.moved.add(target.label);
        }
        error = null;
        break;
      } catch (e) {
        error = String(e.message ?? e).split("\n")[0];
        if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
    visited++;
    if (error) {
      failed.push({ target, error });
      console.error(`  ✗ ${target.url}: ${error}`);
    }
    if (visited % 50 === 0) console.log(`  ${visited}/${targets.length} pages, ${pictures.size} pictures so far`);
  }
}

const jobs = [];
try {
  await Promise.all(Array.from({ length: Math.min(opts.jobs, targets.length) }, crawler));

  for (const [hash, entry] of pictures) {
    if (!entry.width || !entry.height) {
      console.error(`  ✗ ${hash}: no width and height in the SVG (seen on ${[...entry.pages][0]})`);
      continue;
    }
    const size = fileSize(entry.width, entry.height, entry.moved.size ? 1 : SCALE);
    const disk = await sizeOnDisk(hash);
    const reason = !disk ? "new" : opts.force ? "forced" : disk.join("x") !== size.join("x") ? "resized" : null;
    if (reason)
      jobs.push({ hash, uri: entry.uri, width: entry.width, height: entry.height, size, quality: QUALITY, reason });
  }
  if (jobs.length && !interrupted) {
    console.log(`art: drawing ${jobs.length} picture${jobs.length === 1 ? "" : "s"}`);
    let drawn = 0;
    const drawer = async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      while (!interrupted && drawn < jobs.length) {
        const job = jobs[drawn++];
        try {
          const data = await page.evaluate(render, job);
          const file = artPath(job.hash);
          const tmp = `${file}.${process.pid}.tmp`;
          fs.writeFileSync(tmp, Buffer.from(data, "base64"));
          fs.renameSync(tmp, file);
          job.done = true;
        } catch (e) {
          job.error = String(e.message ?? e).split("\n")[0];
          console.error(`  ✗ ${job.hash}: ${job.error}`);
        }
      }
      await context.close();
    };
    await Promise.all(Array.from({ length: Math.min(opts.jobs, jobs.length) }, drawer));
  }
} finally {
  await browser.close();
}

let deleted = 0;
if (full && !interrupted) {
  if (failed.length) {
    console.log(`art: ${failed.length} page${failed.length === 1 ? "" : "s"} failed, so no unused files were deleted`);
  } else {
    for (const hash of artHashes()) {
      if (pictures.has(hash)) continue;
      fs.rmSync(artPath(hash));
      deleted++;
    }
  }
}

writeArtModule();

const count = (reason) => jobs.filter((j) => j.done && j.reason === reason).length;
const small = [...pictures].filter(([, entry]) => entry.moved.size);
console.log(
  `\nart: ${pictures.size} picture${pictures.size === 1 ? "" : "s"} on ${visited} pages in ${minutes(Date.now() - started)}: ` +
    `${count("new")} new, ${count("resized")} redrawn at a new size, ${count("forced")} redone with --force` +
    `${deleted ? `, ${deleted} unused deleted` : ""}${failed.length ? `, ${failed.length} pages failed` : ""}.`,
);
console.log(`public/art: ${artHashes().length} files, ${megabytes(folderBytes())}.`);
if (small.length) {
  const byDemo = new Map();
  for (const [hash, entry] of small)
    for (const label of entry.moved) byDemo.set(label, [...(byDemo.get(label) ?? []), hash]);
  console.log(`  ${small.length} saved at their own size, because an <img> takes its size from them:`);
  for (const [label, hashes] of [...byDemo].sort()) console.log(`    ${label}: ${hashes.length}`);
}
for (const job of jobs.filter((j) => j.error)) console.log(`  not drawn: ${job.hash}: ${job.error}`);
if (failed.length) {
  console.log(`  failed pages:`);
  for (const { target, error } of failed) console.log(`    ${target.url}: ${error}`);
}
process.exit(failed.length || jobs.some((j) => j.error) ? 1 : 0);

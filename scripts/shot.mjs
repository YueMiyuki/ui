#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE_URL,
  BROWSER_TAG,
  COMPOSITED,
  capture,
  checkServer,
  contextOptions,
  launchBrowser,
  watchPage,
} from "./lib/browser.mjs";
import { readItems } from "./lib/items.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots");

const HELP = `Usage: node scripts/shot.mjs <slug>[:<demo>] [...more] [options]

Opens ${BASE_URL}/preview/<slug>/<demo>?theme=<theme> in headless Chrome and
saves .shots/<slug>[.<demo>].<theme>.png. The demo defaults to "default".
With MIYUKI_BROWSER=webkit it uses WebKit and adds .webkit to the file name.
WebKit screenshots flatten 3D transforms and leave out backdrop-filter; add
MIYUKI_COMPOSITED=1 to take the last frame of a video instead (1x, no --full).

Options
  --theme light|dark|ink|both   theme to shoot (default both: light and dark)
  --size 1200x800           viewport size (default 1200x800)
  --wait 1200               extra milliseconds to wait after the network is idle
  --scale 1                 device pixel ratio (default 1)
  --scroll <y>              scroll the page to y before shooting
  --move <x>,<y>            move the mouse to x,y
  --hover <css>             hover the first element matching the selector
  --click <css>             click the first element matching the selector
  --full                    capture the full scrollable page
  --tag <name>              add .<name> to the file name, e.g. --tag hover
  --help                    show this text

Actions run in the order scroll, move, hover, click, then wait 400ms.
Env: MIYUKI_URL (default http://localhost:3210), MIYUKI_BROWSER (chrome or webkit),
MIYUKI_COMPOSITED=1 (WebKit only).

Examples
  node scripts/shot.mjs button
  node scripts/shot.mjs button:states --theme dark --hover "button" --tag hover
  node scripts/shot.mjs hiding-banner --scroll 600 --size 900x600`;

function parseArgs(argv) {
  const opts = { targets: [], theme: "both", size: "1200x800", wait: 1200, full: false };
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
      case "--theme":
        opts.theme = value();
        break;
      case "--size":
        opts.size = value();
        break;
      case "--wait":
        opts.wait = Number(value());
        break;
      case "--scale":
        opts.scale = Number(value());
        break;
      case "--hover":
        opts.hover = value();
        break;
      case "--click":
        opts.click = value();
        break;
      case "--move":
        opts.move = value();
        break;
      case "--scroll":
        opts.scroll = Number(value());
        break;
      case "--tag":
        opts.tag = value().replace(/[^\w-]/g, "");
        break;
      case "--full":
        opts.full = true;
        break;
      default:
        if (arg.startsWith("--")) fail(`Unknown option ${arg}. See --help.`);
        opts.targets.push(arg);
    }
  }
  if (!["light", "dark", "ink", "both"].includes(opts.theme)) fail(`--theme must be light, dark, ink or both`);
  const size = opts.size.match(/^(\d+)x(\d+)$/);
  if (!size) fail(`--size must look like 1200x800`);
  opts.viewport = { width: Number(size[1]), height: Number(size[2]) };
  if (!Number.isFinite(opts.wait) || opts.wait < 0) fail(`--wait must be a number of milliseconds`);
  if (opts.move && !/^\d+,\d+$/.test(opts.move)) fail(`--move must look like 400,300`);
  if (opts.scroll !== undefined && !Number.isFinite(opts.scroll)) fail(`--scroll must be a number`);
  if (opts.targets.length === 0) fail(`Name at least one slug. See --help.`);
  return opts;
}

function fail(message) {
  console.error(`shot: ${message}`);
  process.exit(1);
}

const opts = parseArgs(process.argv.slice(2));

const catalogue = readItems();
if (catalogue) {
  const bySlug = new Map(catalogue.map((item) => [item.slug, item]));
  opts.targets = opts.targets.filter((target) => {
    const [slug, demo = "default"] = target.split(":");
    const item = bySlug.get(slug);
    if (!item) {
      console.error(`✗ ${slug} is not in the registry. Is its meta.json valid? Run pnpm registry to see.`);
      return false;
    }
    if (!item.demos.some((d) => d.name === demo)) {
      console.error(`✗ ${slug} has no demo "${demo}". Its demos: ${item.demos.map((d) => d.name).join(", ")}.`);
      return false;
    }
    return true;
  });
  if (opts.targets.length === 0) process.exit(1);
}

await checkServer();
fs.mkdirSync(OUT, { recursive: true });

const themes = opts.theme === "both" ? ["light", "dark"] : [opts.theme];
const browser = await launchBrowser();
let problems = 0;

try {
  for (const target of opts.targets) {
    const [slug, demo = "default"] = target.split(":");
    for (const theme of themes) {
      const context = await browser.newContext(
        contextOptions({
          viewport: opts.viewport,
          colorScheme: theme === "ink" ? "dark" : theme,
          deviceScaleFactor: opts.scale > 0 ? opts.scale : 1,
        }),
      );
      const page = await context.newPage();
      const seen = watchPage(page);
      const url = `${BASE_URL}/preview/${slug}/${demo}?theme=${theme}`;
      const response = await page.goto(url, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("[data-preview]", { timeout: 15_000 }).catch(() => {});
      const missing = (response && response.status() === 404) || (await page.locator("[data-preview]").count()) === 0;
      if (missing) {
        console.error(`✗ ${slug}:${demo} is not in the registry (404 at ${url}). Run pnpm registry?`);
        problems++;
        await context.close();
        break;
      }
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(opts.wait);

      if (opts.scroll !== undefined) await page.evaluate((y) => window.scrollTo(0, y), opts.scroll);
      if (opts.move) {
        const [x, y] = opts.move.split(",").map(Number);
        await page.mouse.move(x, y, { steps: 8 });
      }
      if (opts.hover)
        await page
          .hover(opts.hover, { timeout: 5_000 })
          .catch((e) => seen.errors.push(`hover: ${e.message.split("\n")[0]}`));
      if (opts.click)
        await page
          .click(opts.click, { timeout: 5_000 })
          .catch((e) => seen.errors.push(`click: ${e.message.split("\n")[0]}`));
      if (opts.scroll !== undefined || opts.move || opts.hover || opts.click) await page.waitForTimeout(400);

      const boundary = await page.locator('[role="alert"]').filter({ hasText: "This demo could not run" }).first();
      if (await boundary.count())
        seen.errors.push(`demo crashed: ${(await boundary.innerText()).replace(/\s+/g, " ")}`);

      const name = [slug, demo !== "default" ? demo : null, opts.tag || null, BROWSER_TAG, theme]
        .filter(Boolean)
        .join(".");
      const file = path.join(OUT, `${name}.png`);
      if (COMPOSITED) await capture(page, file);
      else await page.screenshot({ path: file, fullPage: opts.full });
      console.log(path.relative(process.cwd(), file) || file);
      for (const e of seen.errors) console.error(`  ✗ ${e}`);
      problems += seen.errors.length;
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (problems)
  console.error(`shot: ${problems} problem${problems === 1 ? "" : "s"} seen in the browser (listed above).`);

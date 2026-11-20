#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL, BROWSER_TAG, checkServer, launchBrowser, watchPage } from "./lib/browser.mjs";
import { readItems } from "./lib/items.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots");
const PER_SHEET = 12;

const HELP = `Usage: node scripts/review.mjs <slug>[:<demo>] [...more]
       node scripts/review.mjs --category <id>
       node scripts/review.mjs --all

Opens ${BASE_URL}/review?slugs=... with twelve components per sheet, waits for
the demos to mount, and saves full-page screenshots to
.shots/review-<label>-<n>.png. Each component shows a light and a Night tile, or the
themes named with --themes.

Options
  --wait 3000   milliseconds to wait for demos after the network is idle
  --zoom 2      one component per row at twice the size, four per sheet
  --label name  file label instead of "custom"
  --themes t,t  tiles to show per component, from light, dark (Night) and ink (Dark);
                default light,dark
  --help        show this text

Env: MIYUKI_URL (default http://localhost:3210), MIYUKI_BROWSER (chrome or webkit;
webkit adds .webkit to the file name).`;

function fail(message) {
  console.error(`review: ${message}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
let category = null;
let all = false;
let wait = 3000;
let zoom = 1;
let customLabel = null;
let themes = ["light", "dark"];
const slugs = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--help" || arg === "-h") {
    console.log(HELP);
    process.exit(0);
  } else if (arg === "--category") category = argv[++i];
  else if (arg === "--all") all = true;
  else if (arg === "--wait") wait = Number(argv[++i]);
  else if (arg === "--zoom") zoom = Number(argv[++i]) || 1;
  else if (arg === "--label") customLabel = argv[++i];
  else if (arg === "--themes") {
    themes = (argv[++i] ?? "").split(",").filter(Boolean);
    if (!themes.length || themes.some((t) => !["light", "dark", "ink"].includes(t)))
      fail("--themes takes a comma-separated list of light, dark and ink.");
  } else if (arg.startsWith("--")) fail(`Unknown option ${arg}. See --help.`);
  else slugs.push(arg);
}

const items = readItems();
if (!items) fail("src/registry/__generated__/items.ts is missing. Run pnpm registry.");
let label;
let targets;
if (all) {
  label = "all";
  targets = items.map((item) => item.slug);
} else if (category) {
  label = category.replace(/[^\w-]/g, "");
  targets = items.filter((item) => item.category === category).map((item) => item.slug);
  if (targets.length === 0) fail(`No items in category "${category}".`);
} else if (slugs.length) {
  label = slugs.length === 1 ? slugs[0].replace(/[^\w-]/g, "-") : "custom";
  const known = new Set(items.map((item) => item.slug));
  for (const s of slugs) if (!known.has(s.split(":")[0])) console.error(`  ! ${s} is not in the registry`);
  targets = slugs;
} else {
  fail("Name slugs, or pass --category <id> or --all. See --help.");
}

if (customLabel) label = customLabel.replace(/[^\w-]/g, "-");
const perSheet = zoom > 1 ? 4 : PER_SHEET;

await checkServer();
fs.mkdirSync(OUT, { recursive: true });
const browser = await launchBrowser();
let problems = 0;

try {
  const sheets = Math.ceil(targets.length / perSheet);
  for (let n = 0; n < sheets; n++) {
    const batch = targets.slice(n * perSheet, (n + 1) * perSheet);
    const rows = zoom > 1 ? batch.length : Math.ceil(batch.length / 2);
    const height = Math.max(1000, rows * (225 * zoom + 34) + 40);
    const columns = zoom > 1 ? 1 : 2;
    const width = Math.max(
      1500,
      columns * (themes.length * 360 * zoom + (themes.length - 1) * 8) + (columns - 1) * 16 + 40,
    );
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: "light" });
    const page = await context.newPage();
    const seen = watchPage(page);
    await page.goto(
      `${BASE_URL}/review?slugs=${batch.map(encodeURIComponent).join(",")}${zoom > 1 ? `&zoom=${zoom}` : ""}${themes.join(",") === "light,dark" ? "" : `&themes=${themes.join(",")}`}`,
      {
        waitUntil: "load",
        timeout: 90_000,
      },
    );
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(wait);
    const crashed = await page.locator('[role="alert"]').filter({ hasText: "This demo could not run" }).count();
    if (crashed) seen.errors.push(`${crashed} demo tile${crashed === 1 ? "" : "s"} crashed (see the sheet)`);
    const file = path.join(OUT, `review-${label}-${n + 1}${BROWSER_TAG ? `.${BROWSER_TAG}` : ""}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(path.relative(process.cwd(), file) || file);
    for (const e of seen.errors) console.error(`  ✗ ${e}`);
    problems += seen.errors.length;
    await context.close();
  }
} finally {
  await browser.close();
}

if (problems)
  console.error(`review: ${problems} problem${problems === 1 ? "" : "s"} seen in the browser (listed above).`);

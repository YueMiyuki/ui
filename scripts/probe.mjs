#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE_URL,
  BROWSER,
  BROWSER_TAG,
  COMPOSITED,
  checkServer,
  contextOptions,
  grabFrames,
  launchBrowser,
  watchPage,
} from "./lib/browser.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".shots", "probe");
const USAGE = `Usage: node scripts/probe.mjs <slug>[:demo] <light|dark|both> '<json actions>' [--size 1000x700] [--scale 2] [--slow 0.1] [--reduced]

Actions run in order. Each is an object with any of these keys:
  wait: ms             pause
  slow: factor         slow time from here on (0.1 is ten times slower, 1 is normal)
  press: "Enter"       press a key; keydown / keyup hold and release one
  type: "text"         type text (delay: ms per key)
  click: sel           click an element; hover: sel hovers it
  moveTo: sel          move the pointer to an element's centre (dx, dy offsets; steps)
  move: [x, y]         move the pointer to page coordinates (steps)
  down: sel            press the mouse button on an element
  mousedown: true      press the button where the pointer is; up: true releases it
  eval: "js"           run script in the page; log: "js" prints its result
  shot: "name"         save .shots/probe/<slug>.<demo>.<name>.<theme>.png
                       sel crops to an element (default: the demo root; use "body" for overlays), pad adds px around it

--slow sets the factor before the page loads, to catch motion that plays on mount.
--reduced emulates prefers-reduced-motion. Pass --scale 1 to keep images small.
MIYUKI_BROWSER=webkit runs it in WebKit and adds .webkit to the file names; there
"slow" reaches CSS animations only through document.getAnimations(). WebKit
screenshots flatten 3D transforms and drop backdrop-filter: with MIYUKI_COMPOSITED=1
each shot is cut from a video of the run instead (1x, timing within a frame or two).

Example:
  node scripts/probe.mjs switch both '[{"click":"[data-preview] label"},{"slow":0.1},{"wait":120},{"shot":"mid"}]' --size 720x450 --scale 1`;
if (process.argv.length < 5 || process.argv.includes("--help")) {
  console.log(USAGE);
  process.exit(process.argv.includes("--help") ? 0 : 1);
}
await checkServer();
fs.mkdirSync(OUT, { recursive: true });
const [target, themeArg, actionsJson, ...rest] = process.argv.slice(2);
let size = "1000x700";
let scale = 2;
let reduced = false;
let initialSlow = 1;
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === "--size") size = rest[++i];
  if (rest[i] === "--scale") scale = Number(rest[++i]);
  if (rest[i] === "--reduced") reduced = true;
  if (rest[i] === "--slow") initialSlow = Number(rest[++i]);
}
const [w, h] = size.split("x").map(Number);
const [slug, demo = "default"] = target.split(":");
const actions = JSON.parse(actionsJson);
const themes = themeArg === "both" ? ["light", "dark"] : [themeArg];
const browser = await launchBrowser();
try {
  for (const theme of themes) {
    const context = await browser.newContext(
      contextOptions({
        viewport: { width: w, height: h },
        colorScheme: theme,
        deviceScaleFactor: scale,
        reducedMotion: reduced ? "reduce" : "no-preference",
      }),
    );
    const page = await context.newPage();
    const started = Date.now();
    const frames = [];
    const seen = watchPage(page);
    await page.addInitScript((initial) => {
      const realNow = performance.now.bind(performance);
      let factor = initial,
        realAt = 0,
        virtAt = 0;
      const virt = (real) => virtAt + (real - realAt) * factor;
      performance.now = () => virt(realNow());
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf(() => cb(virt(realNow())));
      window.__miyukiSetSlow = (f) => {
        const r = realNow();
        virtAt = virt(r);
        realAt = r;
        factor = f;
      };
      const st = window.setTimeout.bind(window);
      window.setTimeout = (fn, ms, ...args) => st(fn, factor > 0 ? (ms ?? 0) / factor : 1e9, ...args);
    }, initialSlow);
    const cdp = BROWSER === "chrome" ? await context.newCDPSession(page) : null;
    const setRate = async (rate) => {
      if (cdp) await cdp.send("Animation.setPlaybackRate", { playbackRate: rate });
      else await page.evaluate((r) => document.getAnimations().forEach((a) => (a.playbackRate = r)), rate);
    };
    if (cdp) await cdp.send("Animation.enable");
    if (cdp && initialSlow !== 1) await setRate(initialSlow);
    await page.goto(`${BASE_URL}/preview/${slug}/${demo}?theme=${theme}`, { waitUntil: "load" });
    await page.waitForSelector("[data-preview]");
    if (!cdp && initialSlow !== 1) await setRate(initialSlow);
    await page.waitForLoadState("networkidle").catch(() => {});
    for (const a of actions) {
      if (a.wait !== undefined) await page.waitForTimeout(a.wait);
      if (a.slow !== undefined) {
        await page.evaluate((f) => window.__miyukiSetSlow(f), a.slow);
        await setRate(a.slow);
      }
      if (a.press) await page.keyboard.press(a.press);
      if (a.keydown) await page.keyboard.down(a.keydown);
      if (a.keyup) await page.keyboard.up(a.keyup);
      if (a.type) await page.keyboard.type(a.type, { delay: a.delay ?? 0 });
      if (a.click) await page.click(a.click);
      if (a.hover) await page.hover(a.hover);
      if (a.moveTo) {
        const box = await page.locator(a.moveTo).first().boundingBox();
        await page.mouse.move(box.x + box.width / 2 + (a.dx ?? 0), box.y + box.height / 2 + (a.dy ?? 0), {
          steps: a.steps ?? 1,
        });
      }
      if (a.move) await page.mouse.move(a.move[0], a.move[1], { steps: a.steps ?? 1 });
      if (a.down) {
        const box = await page.locator(a.down).first().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
      }
      if (a.mousedown) await page.mouse.down();
      if (a.up) await page.mouse.up();
      if (a.eval) await page.evaluate(a.eval);
      if (a.log) console.log(JSON.stringify(await page.evaluate(a.log)));
      if (a.shot) {
        const sel = a.sel ?? "[data-preview] > :not(template):not([hidden])";
        const box = await page.locator(sel).first().boundingBox();
        const pad = a.pad ?? 24;
        const clip = {
          x: Math.max(0, box.x - pad),
          y: Math.max(0, box.y - pad),
          width: Math.min(w, box.width + pad * 2),
          height: Math.min(h, box.height + pad * 2),
        };
        const file = path.join(OUT, `${[slug, demo, a.shot, BROWSER_TAG, theme].filter(Boolean).join(".")}.png`);
        if (COMPOSITED) frames.push({ file, clip, at: Date.now() - started });
        else await page.screenshot({ path: file, clip, animations: "allow" });
        console.log(path.relative(process.cwd(), file));
      }
    }
    for (const e of seen.errors) console.error(`  ✗ ${e}`);
    if (COMPOSITED) await grabFrames(page, frames);
    await context.close();
  }
} finally {
  await browser.close();
}

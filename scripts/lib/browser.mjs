import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

export const BASE_URL = (process.env.MIYUKI_URL || "http://localhost:3210").replace(/\/+$/, "");

export const BROWSER = (process.env.MIYUKI_BROWSER || "chrome").toLowerCase();

export const BROWSER_TAG = BROWSER === "chrome" ? null : BROWSER;

const HEADED = /^(1|true|yes)$/i.test(process.env.MIYUKI_HEADED || "");

// WebKit's page.screenshot flattens 3D transforms and leaves out backdrop-filter, and Firefox's leaves out backdrop-filter; a video frame shows what the browser composites
export const COMPOSITED = BROWSER !== "chrome" && /^(1|true|yes)$/i.test(process.env.MIYUKI_COMPOSITED || "");

function ffmpeg() {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), "Library", "Caches", "ms-playwright"),
    path.join(os.homedir(), ".cache", "ms-playwright"),
    path.join(os.homedir(), "AppData", "Local", "ms-playwright"),
  ].filter(Boolean);
  for (const root of roots) {
    let dirs = [];
    try {
      dirs = fs
        .readdirSync(root)
        .filter((d) => d.startsWith("ffmpeg-"))
        .sort()
        .reverse();
    } catch {
      continue;
    }
    for (const d of dirs) {
      const bin = fs.readdirSync(path.join(root, d)).find((f) => f.startsWith("ffmpeg"));
      if (bin) return path.join(root, d, bin);
    }
  }
  throw new Error("Playwright's ffmpeg is missing. Fetch it with: pnpm exec playwright install ffmpeg");
}

export function contextOptions(options, composited = COMPOSITED) {
  if (!composited) return options;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "miyuki-frames-"));
  return { ...options, recordVideo: { dir, size: options.viewport } };
}

export async function grabFrames(page, shots) {
  const video = page.video();
  await page.context().close();
  const src = await video.path();
  try {
    for (const { file, at, clip } of shots) {
      const args = [
        "-loglevel",
        "error",
        ...(at === undefined ? ["-sseof", "-0.15"] : ["-ss", (at / 1000).toFixed(3)]),
        "-i",
        src,
        "-frames:v",
        "1",
      ];
      if (clip)
        args.push(
          "-vf",
          `crop=${Math.round(clip.width)}:${Math.round(clip.height)}:${Math.round(clip.x)}:${Math.round(clip.y)}`,
        );
      execFileSync(ffmpeg(), [...args, "-y", file]);
    }
  } finally {
    fs.rmSync(path.dirname(src), { recursive: true, force: true });
  }
}

export async function capture(page, file, composited = COMPOSITED) {
  if (!composited) return page.screenshot({ path: file });
  await page.waitForTimeout(300);
  await grabFrames(page, [{ file }]);
}

export async function checkServer() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(8_000), redirect: "manual" });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    console.error(
      `Cannot reach the dev server at ${BASE_URL} (${error.cause?.code ?? error.message}).\n` +
        `Start it with "pnpm dev", or point MIYUKI_URL at a running server.`,
    );
    process.exit(2);
  }
}

const GPU_ARGS = ["--enable-webgl", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"];

async function hasWebGL(browser) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    });
  } finally {
    await page.close();
  }
}

async function launchWebKit() {
  try {
    const browser = await webkit.launch({ headless: true });
    if (!(await hasWebGL(browser))) console.error("Warning: WebGL is not available in headless WebKit.");
    return browser;
  } catch (error) {
    console.error(`Could not start WebKit: ${error.message.split("\n")[0]}`);
    console.error(`Fetch it once with: pnpm exec playwright install webkit`);
    process.exit(3);
  }
}

async function launchFirefox() {
  try {
    return await firefox.launch({ headless: !HEADED });
  } catch (error) {
    console.error(`Could not start Firefox: ${error.message.split("\n")[0]}`);
    console.error(`Fetch it once with: pnpm exec playwright install firefox`);
    process.exit(3);
  }
}

export async function launchBrowser(name = BROWSER) {
  if (name === "webkit") return launchWebKit();
  if (name === "firefox") return launchFirefox();
  if (name !== "chrome") {
    console.error(`MIYUKI_BROWSER must be chrome, firefox or webkit, not "${name}".`);
    process.exit(1);
  }
  const launch = (extra) => chromium.launch({ channel: "chrome", headless: true, args: [...GPU_ARGS, ...extra] });
  let browser;
  try {
    browser = await launch(process.platform === "darwin" ? ["--use-angle=metal"] : []);
  } catch (error) {
    console.error(`Could not start system Chrome: ${error.message.split("\n")[0]}`);
    console.error(`Install Google Chrome; the scripts do not download browsers.`);
    process.exit(3);
  }
  if (await hasWebGL(browser)) return browser;
  await browser.close();
  browser = await launch(["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]);
  if (!(await hasWebGL(browser))) console.error("Warning: WebGL is not available in headless Chrome.");
  return browser;
}

const NOISE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/,
  /\[HMR\]/,
  /webpack-hmr/,
  /^%o/,
  /__nextjs_original-stack-frames/,
];

export function watchPage(page) {
  const seen = { errors: [] };
  page.on("pageerror", (error) => {
    if (NOISE.some((re) => re.test(error.message))) return;
    seen.errors.push(`page error: ${error.message.split("\n")[0]}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (NOISE.some((re) => re.test(text))) return;
    seen.errors.push(`console: ${text.split("\n")[0].slice(0, 400)}`);
  });
  return seen;
}

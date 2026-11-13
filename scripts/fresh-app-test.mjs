#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const ITEMS_SRC = path.join(SRC, "registry", "items");
const DEMO_LIB_SRC = path.join(SRC, "registry", "lib");
const PUBLIC_R = path.resolve(ROOT, process.env.MIYUKI_REGISTRY_OUT || path.join("public", "r"));

const NAMESPACE = "@miyuki-ui";
const ROUTE_BASE = "items";
const SERVED_BASE = "served";
const RESULTS_FILE = "fresh-app-results.json";
const MARKER_FILE = ".miyuki-fresh-app.json";
const COMPONENT_TYPES = new Set(["registry:ui", "registry:block"]);
const EMBEDDING_CATEGORIES = new Set(["blocks", "templates"]);
const SEGMENT_MARKUP =
  /role="spinbutton"[^>]*data-type="(?:era|year|month|day|hour|minute|second|dayPeriod|timeZoneName)"/;
const CALENDAR_MARKUP = /<table[^>]*role="grid"/;
const IMPLICIT_PACKAGES = new Set(["react", "react-dom", "next"]);
const PACKAGE_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
]);
const STOCK_COMPONENTS = [
  "accordion",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "button-group",
  "calendar",
  "card",
  "carousel",
  "checkbox",
  "combobox",
  "context-menu",
  "dialog",
  "drawer",
  "input",
  "input-otp",
  "pagination",
  "popover",
  "progress",
  "select",
  "skeleton",
  "slider",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "tooltip",
];
const ENV = { NEXT_TELEMETRY_DISABLED: "1", DO_NOT_TRACK: "1", NO_COLOR: "1", FORCE_COLOR: "0" };
const IS_WIN = process.platform === "win32";
const NPX = IS_WIN ? "npx.cmd" : "npx";

const USAGE = `Usage: node scripts/fresh-app-test.mjs [slug ...] [options]

Installs miyuki-ui items into a fresh Next.js app (TypeScript, Tailwind 4, App Router,
cacheComponents) with the shadcn CLI, gives each item a statically prerendered page
that renders its demos, then runs tsc and next build and reports what failed.

Items whose meta.json sets "suspense": true read the clock inside React Aria, so their
demos are wrapped in <Suspense>; every other item renders unwrapped. Next.js prerenders
the fallback of such a boundary and the browser renders the control, so the build alone
does not show the control works on the server. For those items and for the blocks and
templates that embed one, the app also gets a /${SERVED_BASE}/<slug> page that renders the
demos at request time (inside <Suspense>, after await connection()). After the build,
next start serves the app: /${ROUTE_BASE}/<slug> must answer 200 with no failed boundary,
and /${SERVED_BASE}/<slug> must answer 200 with the real control's markup in it; neither
may log a server error.

  slug ...           test only these items (default: every component in the registry)
  --dir <path>       work directory (default: <os tmp>/miyuki-ui-fresh-app); the app in
                     <dir>/next-app is reused when it exists
  --fresh            delete the app and create it again
  --registry <url>   where <name>.json is served (default: http://localhost:3210/r);
                     falls back to the files in public/r when it does not answer
  --files            install from the files in public/r even when the server answers
  --pm pnpm|npm      package manager for a new app (default: pnpm when installed)
  --batch <n>        items per shadcn add call (default 10); a failing call is retried
                     one item at a time
  --no-install       keep the installed components; refresh demos and pages, then check
  --no-build         stop after type checking
  --no-serve         skip requesting the wrapped and embedding routes after the build
  -h, --help         show this text

Prints a table (item, wrap, installed, types, build, serve, first error line) and writes the full
results to <dir>/${RESULTS_FILE}; command output goes to <dir>/logs/.
Exits 1 when any item fails.

Env: MIYUKI_REGISTRY_OUT  directory of the built item files (default public/r)

Examples
  node scripts/fresh-app-test.mjs
  node scripts/fresh-app-test.mjs date-picker moon-phase
  node scripts/fresh-app-test.mjs --fresh --dir ../miyuki-fresh`;

function fail(message) {
  console.error(`fresh-app: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = {
    slugs: [],
    dir: null,
    fresh: false,
    registry: "http://localhost:3210/r",
    files: false,
    pm: null,
    batch: 10,
    install: true,
    build: true,
    serve: true,
  };
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    let inline;
    if (arg.startsWith("--") && arg.includes("="))
      [arg, inline] = [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)];
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined || v === "") fail(`${arg} needs a value. See --help.`);
      return v;
    };
    switch (arg) {
      case "-h":
      case "--help":
        console.log(USAGE);
        process.exit(0);
        break;
      case "--dir":
        opts.dir = value();
        break;
      case "--fresh":
        opts.fresh = true;
        break;
      case "--registry":
        opts.registry = value()
          .replace(/\/+$/, "")
          .replace(/\/\{name\}\.json$/, "");
        break;
      case "--files":
        opts.files = true;
        break;
      case "--pm":
        opts.pm = value();
        if (!["pnpm", "npm"].includes(opts.pm)) fail("--pm must be pnpm or npm");
        break;
      case "--batch":
        opts.batch = Number(value());
        if (!Number.isInteger(opts.batch) || opts.batch < 1) fail("--batch must be a whole number above 0");
        break;
      case "--no-install":
        opts.install = false;
        break;
      case "--no-build":
        opts.build = false;
        break;
      case "--no-serve":
        opts.serve = false;
        break;
      default:
        if (arg.startsWith("-")) fail(`unknown option ${arg}. See --help.`);
        opts.slugs.push(arg);
    }
  }
  return opts;
}

const exists = (p) => fs.existsSync(p);
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, data) => fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
const toPosix = (p) => p.split(path.sep).join("/");
const stripAnsi = (s) => s.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\r/g, "\n");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunk = (list, size) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

function duration(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function packageName(spec) {
  const parts = spec.split("/");
  const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  return name.replace(/(.)@.*$/, "$1");
}

function removeInside(parent, target) {
  const rel = path.relative(parent, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`refusing to delete ${target}`);
  fs.rmSync(target, { recursive: true, force: true });
}

function log(line = "") {
  console.log(line);
}

function run(cmd, args, { cwd, timeout = 30 * 60_000, logFile, env } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = "";
    let done = false;
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...ENV, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: IS_WIN,
    });
    const finish = (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      out = stripAnsi(out);
      if (logFile) {
        const head = `$ ${[path.basename(cmd), ...args].join(" ")}   [exit ${code}, ${duration(Date.now() - started)}]`;
        fs.appendFileSync(logFile, `${head}\n${out}\n\n`);
      }
      resolve({ code, out });
    };
    const timer = setTimeout(() => {
      out += `\n[stopped after ${duration(timeout)}]`;
      child.kill("SIGKILL");
    }, timeout);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (error) => {
      out += `\n${error.message}`;
      finish(127);
    });
    child.on("close", (code) => finish(code ?? 1));
  });
}

let tsModule;
function typescript() {
  if (tsModule === undefined) {
    try {
      tsModule = createRequire(path.join(ROOT, "package.json"))("typescript");
    } catch {
      tsModule = null;
    }
  }
  return tsModule;
}

function importsOf(code) {
  const ts = typescript();
  if (ts) return ts.preProcessFile(code, true, true).importedFiles.map((f) => f.fileName);
  const specs = new Set();
  for (const m of code.matchAll(
    /(?:^|[;\n}])\s*(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s*)?["']([^"'\n]+)["']/g,
  ))
    specs.add(m[1]);
  for (const m of code.matchAll(/\b(?:import|require)\(\s*["']([^"'\n]+)["']\s*\)/g)) specs.add(m[1]);
  return [...specs];
}

const RESOLVE_SUFFIXES = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];

function depName(ref) {
  const url = ref.match(/\/r\/([a-z0-9-]+)\.json$/);
  if (url) return url[1];
  const ns = ref.match(new RegExp(`^${NAMESPACE}/([a-z0-9-]+)$`));
  return ns ? ns[1] : null;
}

function targetRel(file) {
  if (file.target) return file.target.replace(/^[@~]\/?/, "");
  return file.path.replace(/^src\//, "");
}

function createRegistry(opts) {
  const indexPath = path.join(PUBLIC_R, "registry.json");
  if (!exists(indexPath)) fail(`${toPosix(path.relative(ROOT, indexPath))} is missing. Run pnpm registry first.`);
  const index = readJson(indexPath);
  const cache = new Map();
  const item = (name) => {
    if (!cache.has(name)) {
      const file = path.join(PUBLIC_R, `${name}.json`);
      cache.set(name, exists(file) ? readJson(file) : null);
    }
    return cache.get(name);
  };
  const owners = new Map();
  for (const entry of index.items) {
    for (const file of item(entry.name)?.files ?? []) owners.set(targetRel(file), entry.name);
  }
  const closures = new Map();
  const closure = (name) => {
    if (closures.has(name)) return closures.get(name);
    const names = new Set();
    const stock = new Set();
    const missing = new Set();
    const visit = (n) => {
      if (names.has(n) || missing.has(n)) return;
      const data = item(n);
      if (!data) return missing.add(n);
      names.add(n);
      for (const dep of data.registryDependencies ?? []) {
        const dn = depName(dep);
        if (dn) visit(dn);
        else stock.add(dep);
      }
    };
    visit(name);
    const files = [...names].flatMap((n) =>
      (item(n).files ?? []).map((f) => ({ owner: n, rel: targetRel(f), content: f.content ?? "" })),
    );
    const packages = new Set(
      [...names].flatMap((n) => [...(item(n).dependencies ?? []), ...(item(n).devDependencies ?? [])].map(packageName)),
    );
    const result = { names, stock, missing, files, packages };
    closures.set(name, result);
    return result;
  };
  return {
    base: opts.registry,
    mode: "server",
    dir: null,
    index,
    item,
    owners,
    closure,
    entry: (name) => index.items.find((i) => i.name === name),
  };
}

function resolveRel(spec, fromRel) {
  if (spec.startsWith("@/")) return spec.slice(2);
  if (spec.startsWith(".")) return path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  return null;
}

function staticProblems(registry, name) {
  const c = registry.closure(name);
  const problems = [];
  for (const m of c.missing) problems.push(`depends on "${m}", which is not in the registry`);
  const shipped = new Set(c.files.map((f) => f.rel));
  for (const file of c.files) {
    for (const spec of importsOf(file.content)) {
      const rel = resolveRel(spec, file.rel);
      if (rel !== null) {
        if (rel === "lib/utils") {
          if (!c.stock.has("utils"))
            problems.push(`${file.rel} imports @/lib/utils but the item does not depend on "utils"`);
          continue;
        }
        if (!RESOLVE_SUFFIXES.some((s) => shipped.has(rel + s))) {
          problems.push(`${file.rel} imports "${spec}", which the item does not install`);
        }
        continue;
      }
      if (spec.startsWith("node:")) continue;
      const pkg = packageName(spec);
      if (!IMPLICIT_PACKAGES.has(pkg) && !c.packages.has(pkg)) {
        problems.push(`${file.rel} imports "${pkg}", which is not in the item's dependencies`);
      }
    }
  }
  return [...new Set(problems)];
}

function demoFiles(slug) {
  const metaPath = path.join(ITEMS_SRC, slug, "meta.json");
  let demos = [{ name: "default" }];
  try {
    const meta = readJson(metaPath);
    if (Array.isArray(meta.demos) && meta.demos.length) demos = meta.demos;
  } catch {
    return [];
  }
  return demos.map((d) => (d.name === "default" ? "demo.tsx" : `demo-${d.name}.tsx`));
}

function scaffoldSources(slugs) {
  const files = [];
  const walk = (dir, relBase) => {
    if (!exists(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = `${relBase}/${entry.name}`;
      if (entry.isDirectory()) walk(abs, rel);
      else if (/\.(tsx?|jsx?|json|css)$/.test(entry.name) && entry.name !== "meta.json") files.push({ abs, rel });
    }
  };
  walk(DEMO_LIB_SRC, "registry/lib");
  for (const slug of slugs) walk(path.join(ITEMS_SRC, slug), `registry/items/${slug}`);
  return files;
}

function scaffoldNeeds(registry, slugs) {
  const owners = new Set();
  const packages = new Set();
  const unresolved = [];
  const sources = scaffoldSources(slugs);
  const local = new Set(sources.map((f) => f.rel));
  for (const file of sources) {
    if (!/\.(tsx?|jsx?)$/.test(file.rel)) continue;
    for (const spec of importsOf(fs.readFileSync(file.abs, "utf8"))) {
      const rel = resolveRel(spec, file.rel);
      if (rel === null) {
        if (!spec.startsWith("node:")) packages.add(packageName(spec));
        continue;
      }
      if (rel === "lib/utils" || RESOLVE_SUFFIXES.some((s) => local.has(rel + s))) continue;
      const owner = RESOLVE_SUFFIXES.map((s) => registry.owners.get(rel + s)).find(Boolean);
      if (owner) owners.add(owner);
      else unresolved.push(`${file.rel} imports "${spec}", which no registry item installs`);
    }
  }
  for (const p of IMPLICIT_PACKAGES) packages.delete(p);
  return { owners, packages, unresolved };
}

function appPaths(app) {
  let base = app;
  try {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(app, "tsconfig.json"), "utf8"));
    const target = tsconfig.compilerOptions?.paths?.["@/*"]?.[0];
    if (target) base = path.join(app, target.replace(/\*$/, ""));
  } catch {}
  const appDir = exists(path.join(base, "app")) ? path.join(base, "app") : path.join(app, "app");
  return { base, appDir };
}

function shadcnCommand(ctx, args) {
  const local = path.join(ctx.app, "node_modules", ".bin", IS_WIN ? "shadcn.cmd" : "shadcn");
  return exists(local) ? [local, args] : [NPX, ["-y", "shadcn@latest", ...args]];
}

function bin(ctx, name) {
  return path.join(ctx.app, "node_modules", ".bin", IS_WIN ? `${name}.cmd` : name);
}

function configureNext(app) {
  const file = ["next.config.ts", "next.config.mjs", "next.config.js"].map((f) => path.join(app, f)).find(exists);
  if (!file) throw new Error("create-next-app wrote no next.config");
  let text = fs.readFileSync(file, "utf8");
  if (!/cacheComponents:\s*true/.test(text)) {
    text = text.replace(/(const nextConfig[^=]*=\s*\{)/, "$1\n  cacheComponents: true,");
  }
  if (!/ignoreBuildErrors/.test(text)) {
    text = text.replace(
      /cacheComponents:\s*true,/,
      (m) =>
        `${m}\n  // fresh-app test: tsc runs on its own, and every failing route is reported instead of the first\n` +
        `  typescript: { ignoreBuildErrors: true },\n  experimental: { prerenderEarlyExit: false, serverSourceMaps: true },`,
    );
  }
  if (!/cacheComponents:\s*true/.test(text) || !/prerenderEarlyExit/.test(text)) {
    throw new Error(`could not set cacheComponents in ${path.basename(file)}`);
  }
  fs.writeFileSync(file, text);
}

function plainLayout(appDir) {
  const file = path.join(appDir, "layout.tsx");
  if (!exists(file) || !fs.readFileSync(file, "utf8").includes("next/font/google")) return;
  fs.writeFileSync(
    file,
    `import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "miyuki-ui fresh app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
`,
  );
}

async function ensureApp(ctx) {
  const { app, work, opts } = ctx;
  const marker = path.join(app, MARKER_FILE);
  if (opts.fresh && exists(app)) removeInside(work, app);
  if (exists(marker)) return { created: false, ...readJson(marker) };
  if (exists(app)) removeInside(work, app);
  fs.mkdirSync(work, { recursive: true });

  const major = ctx.nextMajor;
  log(`  creating a Next.js ${major} app with ${ctx.pm}`);
  let r = await run(
    NPX,
    [
      "-y",
      `create-next-app@${major}`,
      path.basename(app),
      "--ts",
      "--tailwind",
      "--eslint",
      "--app",
      "--cache-components",
      "--no-src-dir",
      "--no-react-compiler",
      "--import-alias",
      "@/*",
      `--use-${ctx.pm}`,
      "--disable-git",
      "--no-agent-feedback",
      "--yes",
    ],
    { cwd: work, logFile: ctx.setupLog, timeout: 15 * 60_000 },
  );
  if (r.code !== 0 || !exists(path.join(app, "package.json")))
    throw new Error(`create-next-app failed. See ${ctx.setupLog}`);
  configureNext(app);
  plainLayout(appPaths(app).appDir);

  log("  shadcn init");
  r = await run(...shadcnCommand(ctx, ["init", "--defaults", "--yes"]), {
    cwd: app,
    logFile: ctx.setupLog,
    timeout: 15 * 60_000,
  });
  if (r.code !== 0 || !exists(path.join(app, "components.json")))
    throw new Error(`shadcn init failed. See ${ctx.setupLog}`);

  log(`  adding shadcn's own ${STOCK_COMPONENTS.join(", ")}`);
  r = await run(...shadcnCommand(ctx, ["add", ...STOCK_COMPONENTS, "--yes"]), { cwd: app, logFile: ctx.setupLog });
  if (r.code !== 0) {
    for (const name of STOCK_COMPONENTS) {
      await run(...shadcnCommand(ctx, ["add", name, "--yes"]), { cwd: app, logFile: ctx.setupLog });
    }
  }

  const info = { createdAt: new Date().toISOString(), packageManager: ctx.pm };
  writeJson(marker, info);
  return { created: true, ...info };
}

async function registryUp(base) {
  try {
    const res = await fetch(`${base}/registry.json`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

function switchToFiles(ctx) {
  const dir = path.join(ctx.work, "registry-files");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const file of fs.readdirSync(PUBLIC_R)) {
    if (!file.endsWith(".json") || file === "registry.json") continue;
    const json = readJson(path.join(PUBLIC_R, file));
    if (Array.isArray(json.registryDependencies)) {
      json.registryDependencies = json.registryDependencies.map((d) => {
        const n = depName(d);
        return n ? path.join(dir, `${n}.json`) : d;
      });
    }
    writeJson(path.join(dir, file), json);
  }
  ctx.registry.mode = "files";
  ctx.registry.dir = dir;
}

async function ensureRegistryEntry(ctx) {
  const file = path.join(ctx.app, "components.json");
  const template = `${ctx.registry.base}/{name}.json`;
  const current = () => readJson(file).registries?.[NAMESPACE];
  if (current() === template) return;
  if (!current()) {
    await run(...shadcnCommand(ctx, ["registry", "add", `${NAMESPACE}=${template}`]), {
      cwd: ctx.app,
      logFile: ctx.setupLog,
    });
    if (current() === template) return;
  }
  const config = readJson(file);
  config.registries = { ...config.registries, [NAMESPACE]: template };
  writeJson(file, config);
}

const itemRef = (ctx, name) =>
  ctx.registry.mode === "server" ? `${NAMESPACE}/${name}` : path.join(ctx.registry.dir, `${name}.json`);

const SNAPSHOT_SKIP = new Set([
  "node_modules",
  ".next",
  ".git",
  "registry",
  "next-env.d.ts",
  "tsconfig.tsbuildinfo",
  MARKER_FILE,
]);

function snapshot(ctx) {
  const files = new Map();
  const pagesDir = toPosix(path.relative(ctx.app, path.join(ctx.paths.appDir, ROUTE_BASE)));
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = toPosix(path.relative(ctx.app, abs));
      if (SNAPSHOT_SKIP.has(rel) || rel === pagesDir) continue;
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) {
        const content = fs.readFileSync(abs);
        files.set(rel, { hash: crypto.createHash("sha1").update(content).digest("hex"), content });
      }
    }
  };
  walk(ctx.app);
  return files;
}

function cssDeclarations(css) {
  const out = new Map();
  const stack = [];
  let buffer = "";
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const ch of text) {
    if (ch === "{") {
      stack.push(buffer.trim().replace(/\s+/g, " "));
      buffer = "";
    } else if (ch === "}") {
      const m = buffer.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
      if (m) out.set(`${stack.join(" > ")} ${m[1]}`, m[2].replace(/\s+/g, " "));
      stack.pop();
      buffer = "";
    } else if (ch === ";") {
      const m = buffer.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
      if (m) out.set(`${stack.join(" > ")} ${m[1]}`, m[2].replace(/\s+/g, " "));
      buffer = "";
    } else buffer += ch;
  }
  return out;
}

function unexpectedChanges(ctx, before, after) {
  const changes = [];
  const miyukiDir = toPosix(path.relative(ctx.app, path.join(ctx.paths.base, "components", "miyuki-ui")));
  for (const [rel, prev] of before) {
    const next = after.get(rel);
    if (PACKAGE_FILES.has(rel)) continue;
    if (!next) {
      changes.push({ path: rel, change: `deleted ${rel}` });
      continue;
    }
    if (next.hash === prev.hash) continue;
    if (rel === ctx.cssRel) {
      const a = cssDeclarations(prev.content.toString("utf8"));
      const b = cssDeclarations(next.content.toString("utf8"));
      for (const [key, value] of a) {
        if (!b.has(key)) changes.push({ path: rel, change: `removed ${key} from ${rel}` });
        else if (b.get(key) !== value)
          changes.push({ path: rel, change: `changed ${key} in ${rel} from "${value}" to "${b.get(key)}"` });
      }
      continue;
    }
    changes.push({ path: rel, change: `overwrote ${rel}` });
  }
  for (const rel of after.keys()) {
    if (before.has(rel) || PACKAGE_FILES.has(rel)) continue;
    if (!rel.startsWith(`${miyukiDir}/`)) changes.push({ path: rel, change: `wrote ${rel}, outside ${miyukiDir}/` });
  }
  return changes;
}

function restore(ctx, before, after) {
  for (const [rel, prev] of before) {
    const next = after.get(rel);
    if (PACKAGE_FILES.has(rel) || (next && next.hash === prev.hash)) continue;
    fs.mkdirSync(path.dirname(path.join(ctx.app, rel)), { recursive: true });
    fs.writeFileSync(path.join(ctx.app, rel), prev.content);
  }
  for (const rel of after.keys()) {
    if (!before.has(rel) && !PACKAGE_FILES.has(rel)) fs.rmSync(path.join(ctx.app, rel), { force: true });
  }
}

function cliError(out) {
  const overwrite = out.match(/The file (.+?) already exists\. Would you like to overwrite\?/);
  if (overwrite) return `stopped at a prompt: ${overwrite[1]} already exists`;
  const lines = out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const at = lines.findIndex((l) => l === "Message:" || l === "Error:");
  if (at >= 0 && lines[at + 1]) return lines[at + 1];
  return lines.find((l) => /error|failed|not found|invalid/i.test(l)) ?? lines.at(-1) ?? "shadcn add failed";
}

const NETWORK_ERROR =
  /Request to https?:\/\/\S+ failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket disconnected|socket hang up|fetch failed/i;

async function shadcnAdd(ctx, names) {
  let r;
  for (let attempt = 0; attempt < 4; attempt++) {
    const refs = names.map((n) => itemRef(ctx, n));
    r = await run(...shadcnCommand(ctx, ["add", ...refs, "--yes"]), {
      cwd: ctx.app,
      logFile: ctx.installLog,
      timeout: 15 * 60_000,
    });
    // without a terminal the CLI answers its own overwrite prompt with "no" and exits 0 having written nothing
    if (/Would you like to overwrite\?/.test(r.out)) return { ...r, code: r.code || 1 };
    if (r.code === 0) return r;
    if (ctx.registry.mode === "server" && !(await registryUp(ctx.registry.base))) {
      log(`  ${ctx.registry.base} stopped answering; waiting up to 90s`);
      let back = false;
      for (let waited = 0; waited < 90_000 && !back; waited += 5000) {
        await sleep(5000);
        back = await registryUp(ctx.registry.base);
      }
      if (!back) {
        log("  switching to the files in public/r");
        switchToFiles(ctx);
      }
      continue;
    }
    if (!NETWORK_ERROR.test(r.out)) return r;
    await sleep(3000 * (attempt + 1));
  }
  return r;
}

function missingFiles(ctx, name) {
  return ctx.registry
    .closure(name)
    .files.filter((f) => !exists(path.join(ctx.paths.base, f.rel)))
    .map((f) => f.rel);
}

async function installItems(ctx, names, fullRun) {
  const outcome = new Map();
  const miyukiDir = path.join(ctx.paths.base, "components", "miyuki-ui");
  if (fullRun) removeInside(ctx.app, miyukiDir);
  else {
    for (const name of names) {
      for (const f of ctx.registry.closure(name).files) fs.rmSync(path.join(ctx.paths.base, f.rel), { force: true });
    }
  }

  const record = (name, data) => {
    const missing = data.error ? [] : missingFiles(ctx, name);
    outcome.set(name, { ...data, missing });
  };

  const batches = chunk(names, ctx.opts.batch);
  let done = 0;
  for (const batch of batches) {
    const started = Date.now();
    const before = snapshot(ctx);
    const r = await shadcnAdd(ctx, batch);
    const after = snapshot(ctx);
    const changes = unexpectedChanges(ctx, before, after);
    if (r.code === 0 && changes.length === 0) {
      for (const name of batch) record(name, { ok: true, changes: [] });
    } else if (batch.length === 1) {
      if (changes.length) restore(ctx, before, after);
      record(batch[0], {
        ok: false,
        error: r.code === 0 ? null : cliError(r.out),
        changes: changes.map((c) => c.change),
      });
    } else {
      if (changes.length) restore(ctx, before, after);
      for (const name of batch) {
        const b = snapshot(ctx);
        const one = await shadcnAdd(ctx, [name]);
        const a = snapshot(ctx);
        const c = unexpectedChanges(ctx, b, a);
        if (c.length) restore(ctx, b, a);
        record(name, {
          ok: one.code === 0 && c.length === 0,
          error: one.code === 0 ? null : cliError(one.out),
          changes: c.map((x) => x.change),
        });
      }
    }
    done += batch.length;
    const bad = batch.filter((n) => !outcome.get(n).ok).length;
    log(
      `  install ${String(done).padStart(String(names.length).length)}/${names.length}  ${bad ? `${bad} failed` : "ok"}  (${duration(Date.now() - started)})`,
    );
  }
  return outcome;
}

async function ensurePackages(ctx, packages) {
  const repoPkg = readJson(path.join(ROOT, "package.json"));
  const ranges = { ...repoPkg.devDependencies, ...repoPkg.dependencies };
  const missing = [...packages].filter((p) => !exists(path.join(ctx.app, "node_modules", p, "package.json")));
  if (!missing.length) return [];
  const specs = missing.map((p) => (ranges[p] ? `${p}@${ranges[p]}` : p));
  log(`  adding packages the demos import: ${missing.join(", ")}`);
  const [cmd, args] = ctx.pm === "pnpm" ? ["pnpm", ["add", ...specs]] : ["npm", ["install", ...specs]];
  const r = await run(IS_WIN ? `${cmd}.cmd` : cmd, args, { cwd: ctx.app, logFile: ctx.setupLog });
  return r.code === 0 ? [] : [`could not install ${missing.join(", ")} for the demos`];
}

function copyScaffold(ctx, slugs) {
  const regDir = path.join(ctx.paths.base, "registry");
  removeInside(ctx.app, regDir);
  for (const file of scaffoldSources(slugs)) {
    const dest = path.join(ctx.paths.base, file.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file.abs, dest);
  }
}

function writeServedPage(ctx, slug, demos) {
  const dir = path.join(ctx.paths.appDir, SERVED_BASE, slug);
  fs.mkdirSync(dir, { recursive: true });
  const imports = demos.map((f, i) => `import Demo${i} from "@/registry/items/${slug}/${f.replace(/\.tsx$/, "")}";`);
  const body = demos.map(
    (_, i) =>
      `      <Suspense fallback={<div data-fresh-fallback="" />}>\n        <AtRequest>\n          <Demo${i} />\n        </AtRequest>\n      </Suspense>`,
  );
  fs.writeFileSync(
    path.join(dir, "page.tsx"),
    `import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
${imports.join("\n")}

async function AtRequest({ children }: { children: ReactNode }) {
  await connection();
  return <>{children}</>;
}

export default function Page() {
  return (
    <main className="flex flex-col gap-16 p-8">
${body.join("\n")}
    </main>
  );
}
`,
  );
}

function writePages(ctx, slugs) {
  const dir = path.join(ctx.paths.appDir, ROUTE_BASE);
  removeInside(ctx.app, dir);
  removeInside(ctx.app, path.join(ctx.paths.appDir, SERVED_BASE));
  for (const slug of slugs) {
    const demos = demoFiles(slug).filter((f) => exists(path.join(ITEMS_SRC, slug, f)));
    const wrap = ctx.wrapped?.has(slug) ?? false;
    const imports = [
      ...(wrap ? [`import { Suspense } from "react";`] : []),
      ...demos.map((f, i) => `import Demo${i} from "@/registry/items/${slug}/${f.replace(/\.tsx$/, "")}";`),
    ];
    const body = demos.map((_, i) =>
      wrap
        ? `      <Suspense fallback={<div data-fresh-fallback="" />}>\n        <Demo${i} />\n      </Suspense>`
        : `      <Demo${i} />`,
    );
    fs.mkdirSync(path.join(dir, slug), { recursive: true });
    fs.writeFileSync(
      path.join(dir, slug, "page.tsx"),
      `${imports.join("\n")}

export default function Page() {
  return (
    <main className="flex flex-col gap-16 p-8">
${body.join("\n")}
    </main>
  );
}
`,
    );
    if (ctx.opts.serve && ctx.partial?.has(slug)) writeServedPage(ctx, slug, demos);
  }
}

function attribute(ctx, rel, slugs) {
  const route = rel.match(new RegExp(`(?:^|/)app/(?:${ROUTE_BASE}|${SERVED_BASE})/([a-z0-9-]+)/`));
  if (route) return { slugs: [route[1]], via: null };
  const demo = rel.match(/(?:^|\/)registry\/items\/([a-z0-9-]+)\//);
  if (demo) return { slugs: slugs.includes(demo[1]) ? [demo[1]] : [], via: null };
  if (/(?:^|\/)registry\/lib\//.test(rel)) return { slugs: [], via: "demo helpers" };
  const baseRel = toPosix(path.relative(ctx.paths.base, path.join(ctx.app, rel)));
  const owner = ctx.registry.owners.get(baseRel);
  if (!owner) return { slugs: [], via: null };
  return { slugs: slugs.filter((s) => ctx.registry.closure(s).names.has(owner)), via: owner };
}

async function typecheck(ctx, slugs) {
  await run(bin(ctx, "next"), ["typegen"], { cwd: ctx.app, logFile: ctx.typesLog });
  const r = await run(bin(ctx, "tsc"), ["--noEmit", "--pretty", "false", "-p", "tsconfig.json"], {
    cwd: ctx.app,
    logFile: ctx.typesLog,
    timeout: 60 * 60_000,
    env: { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`.trim() },
  });
  const perItem = new Map();
  const global = [];
  const lines = r.out.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
    if (!m) continue;
    const [, file, line, , code, message] = m;
    const rel = toPosix(file);
    const text = `${rel}:${line} ${code} ${message}`;
    const { slugs: hit, via } = attribute(ctx, rel, slugs);
    if (!hit.length) {
      global.push(via ? `${via}: ${text}` : text);
      continue;
    }
    for (const slug of hit) {
      if (!perItem.has(slug)) perItem.set(slug, []);
      perItem.get(slug).push(text);
    }
  }
  if (r.code !== 0 && perItem.size === 0 && global.length === 0)
    global.push(`tsc failed: ${r.out.trim().split("\n").at(-1)}`);
  return { perItem, global };
}

function parseCompileErrors(out) {
  const start = out.search(/Turbopack build failed with \d+ errors?:|Build error occurred/);
  if (start < 0) return [];
  const lines = out.slice(start).split("\n");
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const head = line.match(/^\.\/(\S+?)(?::(\d+):(\d+))?$/);
    if (head) {
      current = { file: head[1], line: head[2] ?? null, message: null, trace: [] };
      blocks.push(current);
      continue;
    }
    if (!current) continue;
    if (!current.message && line.trim() && !/^\s*\d+ \||^\s*>|^\s*\|/.test(line))
      current.message = line.trim().replace(/^Error:\s*/, "");
    const traced = line.match(
      new RegExp(`^\\s+\\.\\/(?:src\\/)?app\\/(?:${ROUTE_BASE}|${SERVED_BASE})\\/([a-z0-9-]+)\\/page\\.tsx`),
    );
    if (traced) current.trace.push(traced[1]);
  }
  return blocks;
}

function parsePrerender(out) {
  const lines = out.split("\n");
  const messages = new Map();
  const route = (s) => s.match(new RegExp(`"/${ROUTE_BASE}/([a-z0-9-]+)"`))?.[1];
  const frameAfter = (from) => {
    for (let j = from; j < Math.min(lines.length, from + 14); j++) {
      if (j > from && /Error occurred prerendering page|Route "\//.test(lines[j])) break;
      const m = lines[j].match(/^\s+at .*?\(((?!https?:)[^()]+?:\d+):\d+\)$/);
      if (m && !m[1].includes("node_modules")) return m[1];
    }
    return null;
  };
  for (let i = 0; i < lines.length; i++) {
    const sync = lines[i].match(new RegExp(`Route "/${ROUTE_BASE}/([a-z0-9-]+)":\\s*(.*)$`));
    if (sync) {
      const message = sync[2].replace(/^Next\.js encountered the unstable value (.+?)\.?$/, "$1 read during prerender");
      if (!messages.has(sync[1])) messages.set(sync[1], { message, at: frameAfter(i + 1) });
      continue;
    }
    if (/Error occurred prerendering page/.test(lines[i])) {
      const slug = route(lines[i]);
      if (!slug || messages.has(slug)) continue;
      let j = i + 1;
      while (j < lines.length && /^\s*(Generating static pages|✓|⨯)/.test(lines[j])) j++;
      const next = lines[j] ?? "";
      if (!next.trim() || /Route "\/|Error occurred prerendering page|^>/.test(next)) continue;
      messages.set(slug, { message: next.trim(), at: frameAfter(j + 1) });
    }
  }
  const failed = new Set(messages.keys());
  const summary = out.match(/Export encountered errors? on[^\n]*\n((?:\s+\/\S.*\n?)+)/);
  if (summary) {
    for (const m of summary[1].matchAll(new RegExp(`/${ROUTE_BASE}/([a-z0-9-]+)`, "g"))) failed.add(m[1]);
  }
  const kinds = new Map();
  for (const m of out.matchAll(new RegExp(`^[┌├└│]\\s+(\\S)\\s+/${ROUTE_BASE}/([a-z0-9-]+)`, "gm")))
    kinds.set(m[2], m[1]);
  return { failed, messages, kinds };
}

async function buildApp(ctx, slugs) {
  const active = new Set(slugs);
  const perItem = new Map();
  const global = [];
  const kinds = new Map();
  const note = (slug, text) => {
    if (!perItem.has(slug)) perItem.set(slug, []);
    perItem.get(slug).push(text);
  };
  for (let round = 1; round <= 10 && active.size; round++) {
    writePages(ctx, [...active]);
    const started = Date.now();
    const logFile = path.join(ctx.logs, `build-${round}.log`);
    fs.rmSync(logFile, { force: true });
    log(`  next build, round ${round}: ${active.size} routes`);
    const r = await run(bin(ctx, "next"), ["build"], {
      cwd: ctx.app,
      logFile,
      timeout: 90 * 60_000,
      env: { NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`.trim() },
    });
    log(`  next build, round ${round}: exit ${r.code} (${duration(Date.now() - started)})`);
    const compiled = /Compiled successfully|Compiled with warnings/.test(r.out);
    if (r.code !== 0 && !compiled) {
      const blocks = parseCompileErrors(r.out);
      const hit = new Set();
      for (const block of blocks) {
        const { slugs: owners, via } = attribute(ctx, block.file, [...active]);
        const affected = new Set([...block.trace.filter((s) => active.has(s)), ...owners]);
        const where = block.line ? `${block.file}:${block.line}` : block.file;
        const text = `${where} ${block.message ?? "compile error"}`;
        if (!affected.size) global.push(`build: ${via ? `${via}: ` : ""}${text}`);
        for (const slug of affected) {
          note(slug, text);
          hit.add(slug);
        }
      }
      if (!hit.size) {
        if (!blocks.length)
          global.push(`build failed before prerendering: ${r.out.trim().split("\n").slice(-3).join(" ")}`);
        global.push(`build stopped; see ${logFile}`);
        for (const slug of active) note(slug, "not built: the build failed for a reason no item explains");
        active.clear();
        break;
      }
      for (const slug of hit) active.delete(slug);
      continue;
    }
    const pre = parsePrerender(r.out);
    for (const slug of pre.failed) {
      const m = pre.messages.get(slug);
      note(slug, m ? `${m.at ? `${m.at} ` : ""}${m.message}` : "prerender failed; see the build log");
      active.delete(slug);
    }
    if (r.code !== 0) {
      if (pre.failed.size) continue;
      global.push(`next build exited ${r.code} without naming a route; see ${logFile}`);
      for (const slug of active) note(slug, "not built: the build failed for a reason no item explains");
      active.clear();
      break;
    }
    for (const [slug, kind] of pre.kinds) kinds.set(slug, kind);
    for (const slug of active) {
      if (perItem.has(slug)) continue;
      const html = path.join(ctx.app, ".next", "server", "app", ROUTE_BASE, `${slug}.html`);
      const kind = kinds.get(slug);
      const allowed = ctx.partial?.has(slug) ? "○◐" : "○";
      if (kind && !allowed.includes(kind)) {
        note(
          slug,
          `route is ${kind === "ƒ" ? "dynamic" : "partially prerendered"} (${kind}), not ${allowed.length > 1 ? "static or partially prerendered" : "static"}`,
        );
      } else if (!exists(html)) note(slug, "no prerendered HTML was written");
    }
    active.clear();
  }
  for (const slug of active) note(slug, "not built: the build still failed to compile after 10 rounds");
  return { perItem, global, kinds };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function serveCheck(ctx, slugs) {
  const results = new Map();
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const logFile = path.join(ctx.logs, "serve.log");
  let out = "";
  const child = spawn(bin(ctx, "next"), ["start", "-p", String(port)], {
    cwd: ctx.app,
    env: { ...process.env, ...ENV },
    stdio: ["ignore", "pipe", "pipe"],
    shell: IS_WIN,
    detached: !IS_WIN,
  });
  const take = (data) => {
    const text = stripAnsi(String(data));
    out += text;
    fs.appendFileSync(logFile, text);
  };
  child.stdout.on("data", take);
  child.stderr.on("data", take);
  const stop = () =>
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once("close", resolve);
      try {
        if (IS_WIN) child.kill();
        else process.kill(-child.pid, "SIGTERM");
      } catch {
        resolve();
      }
      setTimeout(resolve, 5000);
    });
  try {
    let ready = false;
    for (let waited = 0; waited < 90_000 && !ready && child.exitCode === null; waited += 500) {
      try {
        await fetch(base, { signal: AbortSignal.timeout(2000) });
        ready = true;
      } catch {
        await sleep(500);
      }
    }
    if (!ready) {
      const last = out.trim().split("\n").at(-1) ?? "no output";
      for (const slug of slugs)
        results.set(slug, { ok: false, control: false, error: `next start did not answer: ${last}` });
      return results;
    }
    log(
      `  next start on port ${port}: requesting ${slugs.length} item${slugs.length === 1 ? "" : "s"}, prerendered and at request time`,
    );
    const request = async (route) => {
      const mark = out.length;
      try {
        const res = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(120_000) });
        const html = await res.text();
        await sleep(400);
        const logged = out
          .slice(mark)
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => /⨯|\bError\b|\berror\b/.test(line));
        return { status: res.status, html, logged };
      } catch (error) {
        return { status: 0, html: "", logged: [], failed: error.message };
      }
    };
    const check = (route, r, needControl) => {
      const problems = [];
      if (r.failed) return [`${route}: request failed: ${r.failed}`];
      if (r.status !== 200) problems.push(`${route}: HTTP ${r.status}`);
      if (r.logged.length) problems.push(`${route}: the server logged: ${r.logged[0]}`);
      if (/<!--\$!-->|data-dgst=/.test(r.html)) problems.push(`${route}: a Suspense boundary failed on the server`);
      if (needControl) {
        const open = [...r.html.matchAll(/<template id="(B:[0-9a-z]+)"/gi)].filter(
          (m) => r.html.split(`"${m[1]}"`).length < 3,
        );
        if (open.length)
          problems.push(
            `${route}: ${open.length} Suspense boundar${open.length === 1 ? "y was" : "ies were"} never filled in`,
          );
      }
      return problems;
    };
    for (const slug of slugs) {
      const prerendered = `/${ROUTE_BASE}/${slug}`;
      const atRequest = `/${SERVED_BASE}/${slug}`;
      const first = await request(prerendered);
      const second = await request(atRequest);
      const control = SEGMENT_MARKUP.test(second.html) || CALENDAR_MARKUP.test(second.html);
      const problems = [...check(prerendered, first, false), ...check(atRequest, second, true)];
      if (!control && ctx.wrapped.has(slug))
        problems.push(`${atRequest}: the control's markup is missing; only the fallback was sent`);
      results.set(slug, {
        ok: problems.length === 0,
        status: second.status,
        control,
        error: problems[0] ?? null,
        problems,
      });
    }
  } finally {
    await stop();
  }
  return results;
}

function printTable(rows) {
  const width = Math.max(4, ...rows.map((r) => r.slug.length));
  const cols = process.stdout.columns || 140;
  const head = `${"item".padEnd(width)}  wrap  installed  types  build  serve  error`;
  log(head);
  log("-".repeat(Math.min(cols, head.length + 40)));
  for (const r of rows) {
    const line = `${r.slug.padEnd(width)}  ${(r.wrap ? "yes" : "").padEnd(4)}  ${r.installed.padEnd(9)}  ${r.types.padEnd(5)}  ${r.build.padEnd(5)}  ${r.serve.padEnd(5)}  ${r.error ?? ""}`;
    log(line.length > cols ? `${line.slice(0, cols - 1)}…` : line);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const started = Date.now();
  const phases = {};
  const phase = async (name, fn) => {
    const t = Date.now();
    log(`\n${name}`);
    const value = await fn();
    phases[name] = Date.now() - t;
    return value;
  };

  const work = path.resolve(opts.dir ?? path.join(os.tmpdir(), "miyuki-ui-fresh-app"));
  const relToRepo = path.relative(ROOT, work);
  if (!relToRepo.startsWith("..") && !path.isAbsolute(relToRepo)) fail("--dir must be outside the repository");
  fs.mkdirSync(work, { recursive: true });
  const logs = path.join(work, "logs");
  fs.rmSync(logs, { recursive: true, force: true });
  fs.mkdirSync(logs, { recursive: true });

  const repoPkg = readJson(path.join(ROOT, "package.json"));
  const nextMajor = String(repoPkg.dependencies?.next ?? repoPkg.devDependencies?.next ?? "").match(/\d+/)?.[0];
  if (!nextMajor) fail("cannot read the Next.js version from package.json");
  const app = path.join(work, "next-app");
  const pm =
    opts.pm ??
    (exists(path.join(app, "package-lock.json"))
      ? "npm"
      : spawnSync(IS_WIN ? "pnpm.cmd" : "pnpm", ["--version"]).status === 0
        ? "pnpm"
        : "npm");

  const registry = createRegistry(opts);
  const ctx = {
    opts,
    work,
    app,
    logs,
    pm,
    nextMajor,
    registry,
    paths: null,
    cssRel: null,
    setupLog: path.join(logs, "setup.log"),
    installLog: path.join(logs, "install.log"),
    typesLog: path.join(logs, "types.log"),
  };

  const known = new Set(registry.index.items.map((i) => i.name));
  const allFolders = fs
    .readdirSync(ITEMS_SRC, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"))
    .map((d) => d.name);
  const folders = allFolders.filter((f) => exists(path.join(ITEMS_SRC, f, "meta.json")));
  const unfinished = allFolders.filter((f) => !folders.includes(f) && !known.has(f));
  const pageOnly = (f) => {
    try {
      const files = readJson(path.join(ITEMS_SRC, f, "meta.json")).files;
      return Array.isArray(files) && files.length === 0;
    } catch {
      return false;
    }
  };
  let slugs;
  if (opts.slugs.length) {
    for (const s of opts.slugs) if (!known.has(s) && !folders.includes(s)) fail(`unknown item "${s}"`);
    slugs = [...new Set(opts.slugs)];
  } else {
    slugs = [
      ...registry.index.items.filter((i) => COMPONENT_TYPES.has(i.type)).map((i) => i.name),
      ...folders.filter((f) => !known.has(f) && !pageOnly(f)).sort(),
    ];
  }
  const inRegistry = slugs.filter((s) => known.has(s));
  const fullRun = opts.slugs.length === 0;
  const flagged = new Set(
    folders.filter((f) => {
      try {
        return readJson(path.join(ITEMS_SRC, f, "meta.json")).suspense === true;
      } catch {
        return false;
      }
    }),
  );

  const rows = new Map(
    slugs.map((slug) => {
      let category = registry.entry(slug)?.categories?.[0];
      if (!category) {
        try {
          category = readJson(path.join(ITEMS_SRC, slug, "meta.json")).category;
        } catch {}
      }
      return [
        slug,
        {
          slug,
          category: category ?? null,
          wrap: flagged.has(slug),
          installed: "-",
          types: "-",
          build: "-",
          serve: "-",
          error: null,
          details: {},
        },
      ];
    }),
  );
  ctx.wrapped = new Set(slugs.filter((s) => flagged.has(s)));
  const embedding = inRegistry.filter(
    (s) =>
      !flagged.has(s) &&
      EMBEDDING_CATEGORIES.has(rows.get(s).category) &&
      [...registry.closure(s).names].some((n) => flagged.has(n)),
  );
  ctx.partial = new Set([...ctx.wrapped, ...embedding]);
  for (const slug of slugs) {
    if (!known.has(slug)) {
      Object.assign(rows.get(slug), {
        installed: "FAIL",
        error: "not in the registry: pnpm registry rejected it or has not run since it was added",
      });
    }
  }
  const globalProblems = [];

  log(`fresh-app test: ${slugs.length} item${slugs.length === 1 ? "" : "s"}, work dir ${work}`);
  if (fullRun && unfinished.length) log(`  skipping ${unfinished.join(", ")}: no meta.json yet`);

  const meta = await phase("setup", async () => {
    const info = await ensureApp(ctx);
    ctx.paths = appPaths(app);
    const components = readJson(path.join(app, "components.json"));
    ctx.cssRel = toPosix(path.relative(app, path.join(ctx.paths.base, components.tailwind?.css ?? "app/globals.css")));
    const up = !opts.files && (await registryUp(registry.base));
    if (up) await ensureRegistryEntry(ctx);
    else {
      if (!opts.files) log(`  ${registry.base} does not answer; installing from public/r`);
      switchToFiles(ctx);
    }
    log(`  ${info.created ? "created" : "reusing"} ${app}`);
    return info;
  });

  const versionOf = (pkg) => {
    try {
      return readJson(path.join(app, "node_modules", pkg, "package.json")).version;
    } catch {
      return null;
    }
  };

  const needs = scaffoldNeeds(registry, inRegistry);
  const covered = new Set(inRegistry.flatMap((s) => [...registry.closure(s).names]));
  const support = [...needs.owners].filter((o) => !covered.has(o));
  for (const u of needs.unresolved) globalProblems.push(`demo: ${u}`);

  const resultsPath = path.join(work, RESULTS_FILE);
  let previous = null;
  try {
    previous = readJson(resultsPath);
  } catch {}

  if (opts.install) {
    const outcome = await phase("install", () => installItems(ctx, [...inRegistry, ...support], fullRun));
    for (const slug of inRegistry) {
      const o = outcome.get(slug);
      const row = rows.get(slug);
      const problems = staticProblems(registry, slug);
      row.details.install = { ...o, incomplete: problems };
      if (!o.ok || o.missing.length) {
        row.installed = "FAIL";
        row.error = o.error ?? o.changes[0] ?? `did not write ${o.missing[0]}`;
      } else if (problems.length) {
        row.installed = "WARN";
        row.error = `incomplete on its own: ${problems[0]}`;
      } else row.installed = "ok";
    }
    for (const name of support) {
      const o = outcome.get(name);
      if (!o.ok) globalProblems.push(`${name}, which the demos need, did not install: ${o.error ?? o.changes[0]}`);
    }
  } else {
    for (const slug of inRegistry) {
      const row = rows.get(slug);
      const before = previous?.items?.find((i) => i.slug === slug);
      const missing = missingFiles(ctx, slug);
      if (missing.length) Object.assign(row, { installed: "FAIL", error: `not installed: ${missing[0]} is missing` });
      else row.installed = before?.installed ?? "kept";
      row.details.install = before?.details?.install ?? null;
    }
  }

  const buildable = inRegistry.filter((s) => rows.get(s).installed !== "FAIL");
  for (const slug of slugs) {
    if (!buildable.includes(slug)) Object.assign(rows.get(slug), { types: "-", build: "-" });
  }

  await phase("demos", async () => {
    globalProblems.push(...(await ensurePackages(ctx, needs.packages)));
    copyScaffold(ctx, buildable);
    writePages(ctx, buildable);
    for (const slug of buildable) {
      if (!demoFiles(slug).some((f) => exists(path.join(ITEMS_SRC, slug, f)))) {
        rows.get(slug).details.demo = "no demo file; the page renders nothing";
      }
    }
    log(`  ${buildable.length} pages under app/${ROUTE_BASE}/`);
  });

  const types = await phase("types", () => typecheck(ctx, buildable));
  for (const g of types.global) globalProblems.push(`types: ${g}`);
  for (const slug of buildable) {
    const row = rows.get(slug);
    const errors = types.perItem.get(slug) ?? [];
    row.types = errors.length ? "FAIL" : "ok";
    row.details.typeErrors = errors;
  }
  log(`  ${buildable.filter((s) => rows.get(s).types === "ok").length}/${buildable.length} type-clean`);

  if (opts.build) {
    const built = await phase("build", () => buildApp(ctx, buildable));
    for (const g of built.global) globalProblems.push(g);
    for (const slug of buildable) {
      const row = rows.get(slug);
      const errors = built.perItem.get(slug) ?? [];
      row.build = errors.length ? "FAIL" : "ok";
      row.details.buildErrors = errors;
      row.details.route = built.kinds.get(slug) ?? null;
    }
  }

  if (opts.build && opts.serve) {
    const targets = [...ctx.partial].filter((s) => rows.get(s)?.build === "ok");
    if (targets.length) {
      const served = await phase("serve", () => serveCheck(ctx, targets));
      for (const [slug, r] of served) {
        const row = rows.get(slug);
        row.serve = !r.ok ? "FAIL" : r.control ? "ok" : "none";
        row.details.serve = r;
      }
      log(
        `  ${targets.filter((s) => rows.get(s).serve !== "FAIL").length}/${targets.length} served; "none" means the control is not in the first view`,
      );
    }
  }

  for (const row of rows.values()) {
    if (row.error && row.installed === "FAIL") continue;
    const first =
      row.details.buildErrors?.[0] ??
      row.details.typeErrors?.[0] ??
      (row.serve === "FAIL" ? `served: ${row.details.serve?.error}` : null);
    if (first) row.error = first;
  }

  const list = [...rows.values()];
  log("");
  printTable(list);

  const count = (key) => list.filter((r) => r[key] === "ok" || (key === "installed" && r.installed === "WARN")).length;
  const totals = {
    items: list.length,
    installed: count("installed"),
    incomplete: list.filter((r) => r.installed === "WARN").length,
    typeClean: count("types"),
    built: opts.build ? count("build") : null,
    wrapped: list.filter((r) => r.wrap).length,
    serveChecked: list.filter((r) => r.serve !== "-").length,
    served: list.filter((r) => r.serve === "ok" || r.serve === "none").length,
  };
  const failed = list.filter(
    (r) =>
      r.installed === "FAIL" ||
      r.installed === "WARN" ||
      r.types === "FAIL" ||
      (opts.build && r.build === "FAIL") ||
      r.serve === "FAIL",
  );

  if (globalProblems.length) {
    log("\nNot tied to one item:");
    for (const g of [...new Set(globalProblems)]) log(`  ${g}`);
  }

  const elapsed = Date.now() - started;
  log(
    `\n${totals.items} items: ${totals.installed} installed${totals.incomplete ? ` (${totals.incomplete} incomplete on their own)` : ""}, ` +
      `${totals.typeClean} type-clean${opts.build ? `, ${totals.built} built` : ""}` +
      `${totals.serveChecked ? `, ${totals.served}/${totals.serveChecked} served` : ""}; ${totals.wrapped} wrapped in <Suspense>. ${failed.length} with problems.`,
  );
  log(
    `time: ${Object.entries(phases)
      .map(([k, v]) => `${k} ${duration(v)}`)
      .join(", ")}; total ${duration(elapsed)}`,
  );

  const results = {
    finishedAt: new Date().toISOString(),
    durationMs: elapsed,
    phases,
    app,
    versions: {
      next: versionOf("next"),
      react: versionOf("react"),
      shadcn: versionOf("shadcn"),
      typescript: versionOf("typescript"),
    },
    packageManager: pm,
    registry: { mode: registry.mode, base: registry.mode === "server" ? registry.base : registry.dir },
    appCreatedAt: meta.createdAt ?? null,
    selection: fullRun ? "all" : slugs,
    totals,
    global: [...new Set(globalProblems)],
    items: list,
  };
  writeJson(resultsPath, results);
  log(`results: ${resultsPath}`);
  log(`logs:    ${logs}`);
  process.exit(failed.length || globalProblems.length ? 1 : 0);
}

main().catch((error) => {
  console.error(`fresh-app: ${error?.stack ?? error}`);
  process.exit(2);
});

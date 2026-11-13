#!/usr/bin/env node

import fs from "node:fs";
import { builtinModules, createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeArtModule } from "./lib/art.mjs";
import { writeThumbsModule } from "./lib/thumbs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const ITEMS_DIR = path.join(SRC, "registry", "items");
const GEN_DIR = path.join(SRC, "registry", "__generated__");
const COMPONENTS_REL = "components/miyuki-ui";
const LIB_REL = `${COMPONENTS_REL}/lib`;
const LIB_DIR = path.join(SRC, LIB_REL);
const UTILS_REL = "lib/utils.ts";
const BLOCK_CATEGORIES = new Set(["blocks", "templates"]);
const LIB_DESCRIPTIONS = {
  chart: "Shared building blocks for miyuki-ui charts: frame, axes, tooltip, legend and range controls.",
  color: "Reads theme colours from CSS variables for canvas and WebGL.",
  prng: "Seeded, deterministic random numbers that match on the server and the client.",
};
const GLOBALS_CSS = path.join(SRC, "app", "globals.css");
const ROOT_REGISTRY = path.join(ROOT, "registry.json");
const PUBLIC_R = path.resolve(ROOT, process.env.MIYUKI_REGISTRY_OUT || path.join("public", "r"));

const ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const INDEX_SCHEMA = "https://ui.shadcn.com/schema/registry.json";
const PUBLIC_SITE_URL = "https://ui.miyuki-yue.dev";
const LOCAL_SITE_URL = "http://localhost:3210";
const SITE_URL = (
  process.env.MIYUKI_SITE_URL || (process.argv.includes("--strict") ? PUBLIC_SITE_URL : LOCAL_SITE_URL)
).replace(/\/+$/, "");
const REGISTRY_NAME = "miyuki-ui";
const BASE_ITEM = "base";
const THEME_ITEM = "theme";
const RESERVED_SLUGS = new Set([BASE_ITEM, THEME_ITEM, "registry", "index"]);

const BASE_VARS = [
  "brand",
  "brand-foreground",
  "brand-soft",
  "brand-strong",
  "success",
  "success-foreground",
  "success-soft",
  "success-strong",
  "warning",
  "warning-foreground",
  "warning-soft",
  "warning-strong",
  "destructive-foreground",
  "destructive-soft",
  "destructive-strong",
  "border-strong",
  "chart-6",
];
const BASE_THEME_VARS = ["ease-settle", "ease-drift", "font-display"];
const THEME_SKIPPED_VARS = new Set(["font-sans", "font-mono"]);
// the CLI maps every cssVars key to a self-referencing @theme line, so these go through `css`
const THEME_CSS_ONLY = /^(miyuki-shadow-|shiki-)/;

// the key order `shadcn build` writes; public/r must match its output byte for byte
const ITEM_KEYS = [
  "$schema",
  "extends",
  "name",
  "title",
  "author",
  "description",
  "dependencies",
  "devDependencies",
  "registryDependencies",
  "files",
  "tailwind",
  "cssVars",
  "css",
  "envVars",
  "meta",
  "docs",
  "categories",
  "type",
];
const FILE_KEYS = ["path", "content", "type", "target"];
const CSS_VARS_KEYS = ["theme", "light", "dark"];

const EXCLUDED_PACKAGES = new Set(["react", "react-dom", "next"]);
const BUILTINS = new Set(builtinModules.flatMap((m) => [m, m.split("/")[0]]));
const RESOLVE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];
const META_KEYS = new Set([
  "$schema",
  "name",
  "category",
  "description",
  "original",
  "suspense",
  "files",
  "demos",
  "preview",
  "props",
]);
const PREVIEW_KEYS = new Set(["layout", "height", "iframe", "thumb", "settle", "thumbClick"]);
const PREVIEW_DEFAULTS = { layout: "center", height: 420, iframe: false, thumb: true };

const argv = new Set(process.argv.slice(2));
const STRICT = argv.has("--strict");
const WATCH = argv.has("--watch");
const SKIP_INITIAL = argv.has("--no-initial");

if (argv.has("--help") || argv.has("-h")) {
  console.log(`Usage: node scripts/build-registry.mjs [--strict] [--watch]

  --strict   exit with code 1 when any item is invalid (used by pnpm build)
  --watch    rebuild when src/registry/items, src/components, src/lib or globals.css change

Env:
  MIYUKI_SITE_URL      site the registry is served from, used for the URLs in registry.json
                    and public/r (default https://ui.miyuki-yue.dev with --strict, which
                    pnpm build uses; http://localhost:3210 otherwise)
  MIYUKI_REGISTRY_OUT  directory for the shadcn item files (default public/r)`);
  process.exit(0);
}

function readSchemaFacts() {
  const text = fs.readFileSync(path.join(SRC, "registry", "schema.ts"), "utf8");
  const block = text.slice(text.indexOf("export const CATEGORIES"), text.indexOf("] as const"));
  const categories = [...block.matchAll(/\bid:\s*"([a-z-]+)"/g)].map((m) => m[1]);
  if (categories.length < 10) throw new Error("Could not read CATEGORIES from src/registry/schema.ts");
  return { categories };
}

const toPosix = (p) => p.split(path.sep).join("/");
const relSrc = (abs) => toPosix(path.relative(SRC, abs));
const isFile = (abs) => {
  try {
    return fs.statSync(abs).isFile();
  } catch {
    return false;
  }
};
const isDir = (abs) => {
  try {
    return fs.statSync(abs).isDirectory();
  } catch {
    return false;
  }
};
const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const nonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const sortStrings = (arr) => [...arr].sort((a, b) => a.localeCompare(b));
const titleFromName = (name) => {
  const words = name.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const demoFile = (slug, demoName) =>
  `registry/items/${slug}/${demoName === "default" ? "demo.tsx" : `demo-${demoName}.tsx`}`;

function packageDependencies() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
    return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  } catch {
    return new Set();
  }
}

function typesFor(dependencies, known) {
  return dependencies
    .map((d) => `@types/${d.startsWith("@") ? d.slice(1).replace("/", "__") : d}`)
    .filter((t) => known.has(t));
}

function writeIfChanged(abs, content) {
  try {
    if (fs.readFileSync(abs, "utf8") === content) return false;
  } catch {}
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, abs);
  return true;
}

function stripComments(src, strings) {
  let out = "";
  let i = 0;
  const n = src.length;
  let lastSignificant = "";
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < n && src[j] !== quote) {
        if (src[j] === "\\") j++;
        else if (quote !== "`" && src[j] === "\n") break;
        j++;
      }
      if (!strings) out += src.slice(i, j + 1);
      else if (quote === "`") out += "``";
      else out += quote + (strings.push(src.slice(i + 1, j)) - 1) + (src[j] ?? "");
      i = j + 1;
      lastSignificant = quote;
      continue;
    }
    if (c === "/" && (lastSignificant === "" || "(,=:[!&|?{};+-*%<>~^".includes(lastSignificant))) {
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== "\n") {
        if (src[j] === "\\") j += 2;
        else {
          if (src[j] === "[") inClass = true;
          else if (src[j] === "]") inClass = false;
          else if (src[j] === "/" && !inClass) break;
          j++;
        }
      }
      out += src.slice(i, j + 1);
      i = j + 1;
      lastSignificant = "/";
      continue;
    }
    out += c;
    if (!/\s/.test(c)) lastSignificant = c;
    i++;
  }
  return out;
}

const STATIC_IMPORT_RE = /(?:^|[;\n}])\s*(import|export)\s+(type\s+)?(?:[\w*{}\s,$]+?\s+from\s*)?["']([^"'\n]+)["']/g;
const DYNAMIC_IMPORT_RE = /\b(?:import|require)\(\s*["']([^"'\n]+)["']\s*\)/g;

function importSpecifiers(code) {
  const strings = [];
  const clean = stripComments(code, strings);
  const specs = new Set();
  for (const m of clean.matchAll(STATIC_IMPORT_RE)) specs.add(strings[m[3]] ?? m[3]);
  for (const m of clean.matchAll(DYNAMIC_IMPORT_RE)) specs.add(strings[m[1]] ?? m[1]);
  return [...specs];
}

function packageName(spec) {
  if (spec.startsWith("@")) return spec.split("/").slice(0, 2).join("/");
  return spec.split("/")[0];
}

function resolveInternal(spec, fromAbs) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(fromAbs), spec);
  else return null;
  if (isFile(base)) return base;
  for (const ext of RESOLVE_EXTENSIONS) if (isFile(base + ext)) return base + ext;
  return undefined;
}

function scanDependencies({ slug, entryFiles, owners, knownPackages, problems }) {
  const dependencies = new Set();
  const registryDependencies = new Set();
  const libs = new Set();
  const seen = new Set();
  const queue = [...entryFiles];

  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(SRC, rel);
    let code;
    try {
      code = fs.readFileSync(abs, "utf8");
    } catch {
      problems.errors.push(`cannot read ${rel}`);
      continue;
    }
    for (const spec of importSpecifiers(code)) {
      const isInternal = spec.startsWith("@/") || spec.startsWith(".");
      if (!isInternal) {
        if (spec.startsWith("node:")) continue;
        const name = packageName(spec);
        if (EXCLUDED_PACKAGES.has(name) || BUILTINS.has(name)) continue;
        if (knownPackages.size && !knownPackages.has(name)) {
          problems.warnings.push(`${rel} imports "${spec}", which is not in package.json. Do not add dependencies.`);
        }
        dependencies.add(name);
        continue;
      }
      if (/^@\/(registry|site|app)(\/|$)/.test(spec)) {
        if (rel.startsWith("components/") || rel.startsWith("lib/")) {
          problems.errors.push(
            `${rel} imports "${spec}". Components and libs must not import from @/registry, @/site or @/app; they have to work when copied into another project.`,
          );
        }
        continue;
      }
      const target = resolveInternal(spec, abs);
      if (!target) {
        problems.warnings.push(`${rel} imports "${spec}", which does not resolve to a file.`);
        continue;
      }
      const targetRel = relSrc(target);
      if (targetRel === UTILS_REL) {
        libs.add(targetRel);
        continue;
      }
      if (targetRel.startsWith(`${LIB_REL}/`)) {
        libs.add(targetRel);
        queue.push(targetRel);
        continue;
      }
      if (targetRel.startsWith(`${COMPONENTS_REL}/`)) {
        const owner = owners.get(targetRel);
        if (owner && owner !== slug) {
          registryDependencies.add(owner);
        } else {
          if (!owner) {
            problems.warnings.push(
              `${rel} imports ${targetRel}, which belongs to no item. List it in "files" so it ships with the component.`,
            );
          }
          queue.push(targetRel);
        }
        continue;
      }
      problems.warnings.push(`${rel} imports ${targetRel}, outside src/${COMPONENTS_REL} and src/${UTILS_REL}.`);
    }
  }

  return {
    dependencies: sortStrings(dependencies),
    registryDependencies: sortStrings(registryDependencies),
    libs: sortStrings(libs),
  };
}

function validateMeta(slug, raw, facts) {
  const errors = [];
  const warnings = [];
  const field = (name) => `"${name}"`;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    errors.push(`folder name must be kebab-case (a-z, 0-9, single dashes); the folder name is the slug`);
  }
  if (RESERVED_SLUGS.has(slug) || slug.startsWith("lib-")) {
    errors.push(
      `the slug "${slug}" is taken by the registry itself (${[...RESERVED_SLUGS].join(", ")} and lib-*); rename the folder`,
    );
  }
  if (!isPlainObject(raw)) {
    errors.push("meta.json must contain a JSON object");
    return { errors, warnings };
  }
  for (const key of Object.keys(raw)) {
    if (!META_KEYS.has(key)) {
      const hint = /dependenc/i.test(key) ? " Dependencies are detected from imports; do not list them." : "";
      warnings.push(`unknown field ${field(key)} is ignored.${hint}`);
    }
  }

  if (!nonEmptyString(raw.name)) errors.push(`${field("name")} must be a non-empty string`);
  if (!nonEmptyString(raw.description)) errors.push(`${field("description")} must be a non-empty string`);
  if (!facts.categories.includes(raw.category)) {
    errors.push(
      `${field("category")} must be one of ${facts.categories.join(", ")} (got ${JSON.stringify(raw.category)})`,
    );
  }
  if (raw.original !== undefined && typeof raw.original !== "boolean") {
    errors.push(`${field("original")} must be true or false`);
  }
  if (raw.suspense !== undefined && typeof raw.suspense !== "boolean") {
    errors.push(`${field("suspense")} must be true or false`);
  }

  if (raw.files !== undefined) {
    if (!Array.isArray(raw.files) || raw.files.some((f) => !nonEmptyString(f))) {
      errors.push(`${field("files")} must be an array of paths relative to src, e.g. "${COMPONENTS_REL}/${slug}.tsx"`);
    }
  }

  if (raw.demos !== undefined) {
    if (!Array.isArray(raw.demos) || raw.demos.length === 0) {
      errors.push(`${field("demos")} must be a non-empty array of { "name", "title" }`);
    } else {
      const names = new Set();
      raw.demos.forEach((d, i) => {
        const at = `demos[${i}]`;
        if (!isPlainObject(d)) return errors.push(`${field(at)} must be an object with "name" and "title"`);
        if (!nonEmptyString(d.name) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.name)) {
          errors.push(`${field(`${at}.name`)} must be kebab-case (got ${JSON.stringify(d.name)})`);
        } else if (names.has(d.name)) {
          errors.push(`${field(`${at}.name`)} "${d.name}" is listed twice`);
        } else names.add(d.name);
        if (d.title !== undefined && !nonEmptyString(d.title)) {
          errors.push(`${field(`${at}.title`)} must be a non-empty string`);
        }
      });
    }
  }

  if (raw.preview !== undefined) {
    const p = raw.preview;
    if (!isPlainObject(p)) errors.push(`${field("preview")} must be an object`);
    else {
      for (const key of Object.keys(p)) {
        if (!PREVIEW_KEYS.has(key)) warnings.push(`unknown field ${field(`preview.${key}`)} is ignored`);
      }
      if (p.layout !== undefined && p.layout !== "center" && p.layout !== "fill") {
        errors.push(`${field("preview.layout")} must be "center" or "fill" (got ${JSON.stringify(p.layout)})`);
      }
      if (p.height !== undefined && !(Number.isInteger(p.height) && p.height >= 120 && p.height <= 2000)) {
        errors.push(`${field("preview.height")} must be a whole number of pixels between 120 and 2000`);
      }
      for (const key of ["iframe", "thumb"]) {
        if (p[key] !== undefined && typeof p[key] !== "boolean") {
          errors.push(`${field(`preview.${key}`)} must be true or false`);
        }
      }
      if (p.settle !== undefined && !(Number.isInteger(p.settle) && p.settle >= 0 && p.settle <= 60000)) {
        errors.push(`${field("preview.settle")} must be a whole number of milliseconds between 0 and 60000`);
      }
      const clicks = typeof p.thumbClick === "string" ? [p.thumbClick] : p.thumbClick;
      if (p.thumbClick !== undefined && !(Array.isArray(clicks) && clicks.length > 0 && clicks.every(nonEmptyString))) {
        errors.push(`${field("preview.thumbClick")} must be a CSS selector or a non-empty list of them`);
      }
    }
  }

  if (raw.props !== undefined) {
    if (!Array.isArray(raw.props)) errors.push(`${field("props")} must be an array of { "component", "props" }`);
    else {
      raw.props.forEach((group, gi) => {
        const at = `props[${gi}]`;
        if (!isPlainObject(group)) return errors.push(`${field(at)} must be an object`);
        if (!nonEmptyString(group.component)) errors.push(`${field(`${at}.component`)} must be a string`);
        if (!Array.isArray(group.props)) return errors.push(`${field(`${at}.props`)} must be an array`);
        group.props.forEach((prop, pi) => {
          const pat = `${at}.props[${pi}]`;
          if (!isPlainObject(prop)) return errors.push(`${field(pat)} must be an object`);
          if (!nonEmptyString(prop.name)) errors.push(`${field(`${pat}.name`)} must be a string`);
          const label = nonEmptyString(prop.name) ? `${pat} (${prop.name})` : pat;
          if (!nonEmptyString(prop.type)) errors.push(`${field(`${label}.type`)} must be a string`);
          if (prop.default !== undefined && typeof prop.default !== "string") {
            errors.push(`${field(`${label}.default`)} must be a string, e.g. "${String(prop.default)}"`);
          }
          if (!nonEmptyString(prop.description)) errors.push(`${field(`${label}.description`)} must be a string`);
        });
      });
    }
  }

  return { errors, warnings };
}

function readItems(facts, report) {
  if (!isDir(ITEMS_DIR)) return { items: [], owners: new Map() };
  const slugs = fs
    .readdirSync(ITEMS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();

  const candidates = [];
  for (const slug of slugs) {
    const problems = report.forItem(slug);
    const metaPath = path.join(ITEMS_DIR, slug, "meta.json");
    if (!isFile(metaPath)) {
      problems.errors.push("meta.json is missing");
      continue;
    }
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch (error) {
      problems.errors.push(`meta.json is not valid JSON: ${error.message}`);
      continue;
    }
    const { errors, warnings } = validateMeta(slug, raw, facts);
    problems.errors.push(...errors);
    problems.warnings.push(...warnings);
    if (errors.length) continue;

    let files;
    if (raw.files !== undefined) {
      files = raw.files.map((f) => {
        let p = toPosix(f).replace(/^\.\//, "");
        if (p.startsWith("src/")) {
          problems.warnings.push(`"files": "${f}" should be relative to src; reading it as "${p.slice(4)}"`);
          p = p.slice(4);
        }
        return p;
      });
      for (const f of files) {
        if (!f.startsWith(`${COMPONENTS_REL}/`) || f.startsWith(`${LIB_REL}/`)) {
          problems.errors.push(`"files": "${f}" must live under src/${COMPONENTS_REL}, outside lib/`);
        } else if (!isFile(path.join(SRC, f))) problems.errors.push(`"files": src/${f} does not exist`);
      }
    } else {
      const found = `${COMPONENTS_REL}/${slug}.tsx`;
      if (!isFile(path.join(SRC, found))) {
        problems.errors.push(`no component file: expected src/${found}, or list "files"`);
      }
      files = isFile(path.join(SRC, found)) ? [found] : [];
    }

    const demoMetas = raw.demos ?? [{ name: "default" }];
    const demos = demoMetas.map((d) => ({
      name: d.name,
      title: d.title ?? (d.name === "default" ? "Default" : titleFromName(d.name)),
      file: demoFile(slug, d.name),
    }));
    for (const d of demos) {
      if (!isFile(path.join(SRC, d.file))) problems.errors.push(`demo "${d.name}" needs src/${d.file}`);
    }

    if (problems.errors.length === 0 && Array.isArray(raw.props)) {
      const sources = files.map((f) => fs.readFileSync(path.join(SRC, f), "utf8")).join("\n");
      for (const group of raw.props) {
        const name = group.component.replace(/[^\w$]/g, "");
        const exported = new RegExp(
          `export\\s+(?:default\\s+)?(?:async\\s+)?(?:function|const|let|class)\\s+${name}\\b|export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`,
        );
        if (!exported.test(sources)) {
          problems.warnings.push(`props documents "${group.component}", which is not exported by ${files.join(", ")}`);
        }
      }
    }

    if (problems.errors.length) continue;

    const preview = { ...PREVIEW_DEFAULTS, ...(raw.preview ?? {}) };
    candidates.push({
      slug,
      name: raw.name.trim(),
      category: raw.category,
      description: raw.description.trim(),
      original: raw.original === true,
      suspense: raw.suspense === true,
      type: BLOCK_CATEGORIES.has(raw.category) ? "registry:block" : "registry:ui",
      files,
      demos,
      preview,
      props: raw.props ?? [],
    });
  }

  const owners = new Map();
  for (const item of candidates) {
    for (const f of item.files) {
      const owner = owners.get(f);
      if (owner) report.forItem(item.slug).errors.push(`src/${f} is already listed by "${owner}"`);
      else owners.set(f, item.slug);
    }
  }

  const knownPackages = packageDependencies();
  const valid = [];
  for (const item of candidates) {
    const problems = report.forItem(item.slug);
    if (problems.errors.length) continue;
    const deps = scanDependencies({ slug: item.slug, entryFiles: item.files, owners, knownPackages, problems });
    if (problems.errors.length) continue;
    valid.push({ ...item, ...deps, devDependencies: typesFor(deps.dependencies, knownPackages) });
  }

  const validSlugs = new Set(valid.map((i) => i.slug));
  for (const item of valid) {
    for (const dep of item.registryDependencies) {
      if (!validSlugs.has(dep)) {
        report.forItem(item.slug).warnings.push(`depends on "${dep}", which is invalid and was skipped`);
      }
    }
  }

  const order = new Map(facts.categories.map((c, i) => [c, i]));
  valid.sort((a, b) => order.get(a.category) - order.get(b.category) || a.name.localeCompare(b.name));
  return { items: valid, owners };
}

function readLibs(knownPackages, owners, report) {
  if (!isDir(LIB_DIR)) return [];
  return fs
    .readdirSync(LIB_DIR)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"))
    .sort()
    .map((file) => {
      const rel = `${LIB_REL}/${file}`;
      const name = file.replace(/\.(ts|tsx)$/, "");
      const problems = report.forItem(`lib-${name}`);
      const deps = scanDependencies({ slug: `lib-${name}`, entryFiles: [rel], owners, knownPackages, problems });
      return {
        name: `lib-${name}`,
        rel,
        description: LIB_DESCRIPTIONS[name] ?? `The ${name} helper used by miyuki-ui components.`,
        dependencies: deps.dependencies,
        devDependencies: typesFor(deps.dependencies, knownPackages),
        registryDependencies: deps.registryDependencies,
        libs: deps.libs.filter((l) => l !== rel),
      };
    });
}

const itemUrl = (name) => `${SITE_URL}/r/${name}.json`;

function libRegistryRef(libRel) {
  if (libRel === UTILS_REL) return "utils";
  return itemUrl(`lib-${path.posix.basename(libRel).replace(/\.(ts|tsx)$/, "")}`);
}

const fileType = (rel) => (rel.startsWith(`${LIB_REL}/`) ? "registry:lib" : "registry:component");

function fileTarget(rel) {
  if (!rel.startsWith(`${COMPONENTS_REL}/`)) throw new Error(`no install target for src/${rel}`);
  return `@${rel}`;
}

const sourceFile = (rel) => ({ path: `src/${rel}`, type: fileType(rel), target: fileTarget(rel) });

function suspenseExample(item) {
  const group = item.props[0];
  const component = group?.component ?? item.name.replace(/[^A-Za-z0-9]/g, "");
  const labelled = group?.props.some((prop) => prop.name === "label") ?? false;
  const noun = item.name.split(" ")[0];
  return [
    `import { Suspense } from "react";`,
    "",
    `<Suspense fallback={<div className="${labelled ? "h-16" : "h-72"}" />}>`,
    `  <${component} ${labelled ? "label" : "aria-label"}="${noun}" />`,
    "</Suspense>",
  ].join("\n");
}

function suspenseDocs(item) {
  return [
    `${item.name} reads today's date while it renders. In a Next.js app with Cache Components turned on, put it inside React's <Suspense>, or the build stops with an error. Give the fallback the size of the control so nothing moves when it appears:`,
    "",
    suspenseExample(item),
    "",
    "miyuki-ui blocks and templates that use it already do this.",
  ].join("\n");
}

function componentEntry(item) {
  const registryDependencies = [
    itemUrl(BASE_ITEM),
    ...item.libs.map(libRegistryRef),
    ...item.registryDependencies.map(itemUrl),
  ];
  return {
    name: item.slug,
    type: item.type,
    title: item.name,
    description: item.description,
    dependencies: item.dependencies,
    ...(item.devDependencies.length ? { devDependencies: item.devDependencies } : {}),
    registryDependencies: [...new Set(registryDependencies)],
    files: item.files.map(sourceFile),
    ...(item.suspense ? { docs: suspenseDocs(item) } : {}),
    categories: [item.category],
  };
}

function libEntry(lib) {
  const registryDependencies = [
    ...(lib.rel.endsWith(".tsx") ? [itemUrl(BASE_ITEM)] : []), // tsx helpers render UI, so they need the tokens
    ...lib.libs.map(libRegistryRef),
    ...lib.registryDependencies.map(itemUrl),
  ];
  return {
    name: lib.name,
    type: "registry:lib",
    title: `lib/${path.posix.basename(lib.rel)}`,
    description: lib.description,
    dependencies: lib.dependencies,
    ...(lib.devDependencies.length ? { devDependencies: lib.devDependencies } : {}),
    registryDependencies: [...new Set(registryDependencies)],
    files: [sourceFile(lib.rel)],
    categories: ["foundations"],
  };
}

function cssBlocks(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [];
  let depth = 0;
  let preludeStart = 0;
  let bodyStart = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "{") {
      if (depth === 0) bodyStart = i + 1;
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        blocks.push({ prelude: text.slice(preludeStart, bodyStart - 1).trim(), body: text.slice(bodyStart, i) });
        preludeStart = i + 1;
      }
    } else if (c === ";" && depth === 0) {
      preludeStart = i + 1;
    }
  }
  return blocks;
}

function customProperties(body) {
  const vars = new Map();
  for (const part of body.split(";")) {
    const m = part.match(/^\s*--([\w-]+)\s*:\s*([\s\S]*?)\s*$/);
    if (m?.[2]) vars.set(m[1], m[2].replace(/\s+/g, " "));
  }
  return vars;
}

function readTokens() {
  const blocks = cssBlocks(fs.readFileSync(GLOBALS_CSS, "utf8"));
  const find = (label, test) => {
    const block = blocks.find((b) => test(b.prelude));
    if (!block) throw new Error(`src/app/globals.css has no ${label} block`);
    return customProperties(block.body);
  };
  const selectors = (prelude) => (prelude.startsWith("@") ? [] : prelude.split(",").map((s) => s.trim()));
  return {
    light: find(":root", (p) => selectors(p).includes(":root")),
    dark: find(".dark", (p) => selectors(p).includes(".dark")),
    theme: find("@theme", (p) => /^@theme\b/.test(p)),
  };
}

function token(vars, name, where) {
  const value = vars.get(name);
  if (value === undefined) throw new Error(`src/app/globals.css: --${name} is missing from ${where}`);
  return value;
}

function plainFontStack(value) {
  const stack = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("var("));
  return stack.length ? stack.join(", ") : "serif";
}

function themeValue(vars, name) {
  const value = token(vars, name, "@theme");
  return name.startsWith("font-") ? plainFontStack(value) : value;
}

function baseEntry(tokens) {
  const theme = {};
  const light = {};
  const dark = {};
  for (const name of BASE_VARS) {
    light[name] = token(tokens.light, name, ":root");
    dark[name] = token(tokens.dark, name, ".dark");
    theme[`color-${name}`] = token(tokens.theme, `color-${name}`, "@theme");
  }
  for (const name of BASE_THEME_VARS) theme[name] = themeValue(tokens.theme, name);
  return {
    name: BASE_ITEM,
    type: "registry:theme",
    title: "Base tokens",
    description:
      "The colours, easings and display font stack miyuki-ui components use that a stock shadcn theme does not define. Every component installs it. It adds variables and never changes existing ones.",
    cssVars: { theme, light, dark },
    categories: ["foundations"],
  };
}

function themeEntry(tokens) {
  const split = (vars) => {
    const cssVars = {};
    const css = {};
    for (const [name, value] of vars) {
      if (THEME_CSS_ONLY.test(name)) css[`--${name}`] = value;
      else cssVars[name] = value;
    }
    return { cssVars, css };
  };
  const light = split(tokens.light);
  const dark = split(tokens.dark);
  const theme = {};
  for (const name of tokens.theme.keys()) {
    if (!THEME_SKIPPED_VARS.has(name)) theme[name] = themeValue(tokens.theme, name);
  }
  return {
    name: THEME_ITEM,
    type: "registry:theme",
    title: "Theme",
    description:
      "The full snow-and-water look: every colour for light and dark, the radius scale, blue-tinted shadows, easings and code colours. It replaces the matching variables in your stylesheet.",
    cssVars: { theme, light: light.cssVars, dark: dark.cssVars },
    css: { ":root": light.css, ".dark": dark.css },
    categories: ["foundations"],
  };
}

function ordered(obj, keys) {
  const out = {};
  for (const key of keys) if (obj[key] !== undefined) out[key] = obj[key];
  return out;
}

function builtItem(entry) {
  const item = { ...entry, $schema: ITEM_SCHEMA };
  if (entry.files) {
    item.files = entry.files.map((file) =>
      ordered({ ...file, content: fs.readFileSync(path.join(ROOT, file.path), "utf8") }, FILE_KEYS),
    );
  }
  if (entry.cssVars) item.cssVars = ordered(entry.cssVars, CSS_VARS_KEYS);
  return ordered(item, ITEM_KEYS);
}

function writeShadcnRegistry(items, libs, tokens) {
  const installable = items.filter((item) => item.files.length > 0);
  const entries = [baseEntry(tokens), themeEntry(tokens), ...installable.map(componentEntry), ...libs.map(libEntry)];
  const registry = `${JSON.stringify({ $schema: INDEX_SCHEMA, name: REGISTRY_NAME, homepage: SITE_URL, items: entries }, null, 2)}\n`;

  let written = 0;
  if (writeIfChanged(ROOT_REGISTRY, registry)) written++;
  const outputs = new Map([["registry.json", registry]]);
  for (const entry of entries) outputs.set(`${entry.name}.json`, JSON.stringify(builtItem(entry), null, 2));
  for (const [file, content] of outputs) {
    if (writeIfChanged(path.join(PUBLIC_R, file), content)) written++;
  }
  if (isDir(PUBLIC_R)) {
    for (const file of fs.readdirSync(PUBLIC_R)) {
      if (file.endsWith(".json") && !outputs.has(file)) {
        fs.rmSync(path.join(PUBLIC_R, file));
        written++;
      }
    }
  }
  return written;
}

let ts;
function typescript() {
  if (ts === undefined) {
    try {
      ts = createRequire(path.join(ROOT, "package.json"))("typescript");
    } catch {
      ts = null;
    }
  }
  return ts;
}

const fileHealthCache = new Map();

function fileHealth(abs) {
  let mtimeMs;
  try {
    mtimeMs = fs.statSync(abs).mtimeMs;
  } catch {
    return { problems: [`${relSrc(abs)} does not exist`], internal: [] };
  }
  const hit = fileHealthCache.get(abs);
  if (hit && hit.mtimeMs === mtimeMs) return hit;

  const rel = relSrc(abs);
  const code = fs.readFileSync(abs, "utf8");
  const problems = [];
  const t = typescript();
  if (t) {
    const out = t.transpileModule(code, {
      fileName: abs,
      reportDiagnostics: true,
      compilerOptions: { jsx: t.JsxEmit.Preserve, target: t.ScriptTarget.ESNext, module: t.ModuleKind.ESNext },
    });
    for (const d of (out.diagnostics ?? []).slice(0, 3)) {
      const pos = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : null;
      const where = pos ? `:${pos.line + 1}:${pos.character + 1}` : "";
      problems.push(
        `syntax error in src/${rel}${where}: ${t.flattenDiagnosticMessageText(d.messageText, " ").replace(/\.$/, "")}`,
      );
    }
  }
  const internal = [];
  for (const spec of importSpecifiers(code)) {
    if (spec.startsWith("@/") || spec.startsWith(".")) {
      const target = resolveInternal(spec, abs);
      if (!target) problems.push(`src/${rel} imports "${spec}", which does not exist`);
      else internal.push(target);
      continue;
    }
    const name = packageName(spec.replace(/^node:/, ""));
    if (spec.startsWith("node:") || BUILTINS.has(name)) {
      problems.push(`src/${rel} imports the Node built-in "${spec}", which does not run in the browser`);
    } else if (!isFile(path.join(ROOT, "node_modules", name, "package.json"))) {
      problems.push(`src/${rel} imports "${spec}", which is not installed`);
    }
  }
  const result = { mtimeMs, problems, internal };
  fileHealthCache.set(abs, result);
  return result;
}

function demoProblems(demoRel) {
  const problems = [];
  const seen = new Set();
  const queue = [path.join(SRC, demoRel)];
  while (queue.length) {
    const abs = queue.shift();
    if (seen.has(abs)) continue;
    seen.add(abs);
    const health = fileHealth(abs);
    problems.push(...health.problems);
    for (const next of health.internal) if (next.startsWith(SRC)) queue.push(next);
  }
  return [...new Set(problems)];
}

function checkDemos(items, report) {
  let broken = 0;
  for (const item of items) {
    for (const demo of item.demos) {
      const problems = demoProblems(demo.file);
      if (problems.length === 0) continue;
      broken++;
      demo.broken = problems[0];
      const label = item.demos.length > 1 ? ` (demo "${demo.name}")` : "";
      const target = STRICT ? report.forItem(item.slug).errors : report.forItem(item.slug).warnings;
      for (const problem of problems.slice(0, 3))
        target.push(`${problem}${label}. The demo is switched off until this is fixed.`);
    }
  }
  return broken;
}

function itemsModule(items) {
  return `// Generated by scripts/build-registry.mjs. Do not edit.
import type { RegistryItem } from "@/registry/schema";

export const items: RegistryItem[] = ${JSON.stringify(items, (key, value) => (key === "broken" ? undefined : value), 2)};
`;
}

function demosModule(items) {
  const lines = [];
  for (const item of items) {
    for (const demo of item.demos) {
      const key = JSON.stringify(`${item.slug}/${demo.name}`);
      if (demo.broken) {
        const message = JSON.stringify(`${demo.broken}. Fix it and save; the demo comes back on its own.`);
        lines.push(`  ${key}: () => Promise.reject(new Error(${message})),`);
      } else {
        const spec = `@/${demo.file.replace(/\.tsx$/, "")}`;
        lines.push(`  ${key}: () => import(${JSON.stringify(spec)}),`);
      }
    }
  }
  return `"use client";

// Generated by scripts/build-registry.mjs. Do not edit.
import type { ComponentType } from "react";

export const demoLoaders: Record<string, () => Promise<{ default: ComponentType }>> = {
${lines.join("\n")}${lines.length ? "\n" : ""}};
`;
}

function createReport() {
  const byItem = new Map();
  return {
    forItem(slug) {
      if (!byItem.has(slug)) byItem.set(slug, { errors: [], warnings: [] });
      return byItem.get(slug);
    },
    entries: () => [...byItem.entries()],
  };
}

function build() {
  const started = performance.now();
  let written = writeArtModule().written ? 1 : 0;
  const facts = readSchemaFacts();
  const report = createReport();
  const { items, owners } = readItems(facts, report);
  const broken = checkDemos(items, report);
  const libs = readLibs(packageDependencies(), owners, report);

  let invalid = 0;
  let warnings = 0;
  for (const [slug, p] of report.entries()) {
    for (const message of p.errors) console.error(`  ✗ ${slug}: ${message}`);
    for (const message of p.warnings) console.warn(`  ! ${slug}: ${message}`);
    if (p.errors.length) invalid++;
    warnings += p.warnings.length;
  }

  if (STRICT && invalid) {
    console.error(`registry: ${invalid} invalid item${invalid === 1 ? "" : "s"}. Fix them or remove the folder.`);
    return { ok: false };
  }

  if (writeIfChanged(path.join(GEN_DIR, "items.ts"), itemsModule(items))) written++;
  if (writeIfChanged(path.join(GEN_DIR, "demos.ts"), demosModule(items))) written++;
  if (writeThumbsModule(items.map((item) => item.slug)).written) written++;

  let registryOk = true;
  try {
    written += writeShadcnRegistry(items, libs, readTokens());
  } catch (error) {
    registryOk = false;
    console.error(`  ✗ shadcn registry not written: ${error?.message ?? error}`);
  }

  const ms = Math.round(performance.now() - started);
  const parts = [`${items.length} item${items.length === 1 ? "" : "s"}`];
  if (invalid) parts.push(`${invalid} skipped`);
  if (broken && !STRICT) parts.push(`${broken} demo${broken === 1 ? "" : "s"} switched off`);
  if (warnings) parts.push(`${warnings} warning${warnings === 1 ? "" : "s"}`);
  parts.push(written ? `${written} file${written === 1 ? "" : "s"} written` : "no changes");
  console.log(`registry: ${parts.join(", ")} (${ms}ms)`);
  return { ok: invalid === 0 && registryOk, written };
}

function safeBuild() {
  try {
    return build();
  } catch (error) {
    console.error(`registry: build failed: ${error?.stack ?? error}`);
    return { ok: false };
  }
}

if (!WATCH) {
  const result = safeBuild();
  process.exit(STRICT && !result.ok ? 1 : 0);
} else {
  if (!SKIP_INITIAL) safeBuild();
  const WATCHED = ["registry/items/", "components/", "lib/", "registry/schema.ts", "app/globals.css"];
  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(safeBuild, 200);
  };
  const watcher = fs.watch(SRC, { recursive: true }, (_event, filename) => {
    if (!filename) return schedule();
    const rel = toPosix(filename.toString());
    if (rel.includes("__generated__")) return;
    if (WATCHED.some((w) => rel === w.replace(/\/$/, "") || rel.startsWith(w))) schedule();
  });
  fs.watch(path.join(ROOT, "package.json"), schedule);
  console.log("registry: watching src/registry/items, src/components, src/lib, src/app/globals.css");
  const stop = () => {
    watcher.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

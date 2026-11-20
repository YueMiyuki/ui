#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extraKeys, readSidecar, SIDECAR, sidecarFields, sidecarPath, sidecarState, sourceHash } from "./lib/i18n.mjs";
import { readItems } from "./lib/items.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const HELP = `Usage: node scripts/i18n.mjs status [<slug> ...]
       node scripts/i18n.mjs check <slug> [...more]
       node scripts/i18n.mjs stamp <slug> [...more] | --all

Works on the Chinese translations of registry items: src/registry/items/<slug>/${SIDECAR}.
It reads the resolved items from src/registry/__generated__/items.ts (run pnpm registry
first) and never writes generated files, so several translators can run it at once.

Commands
  status   counts, then the items whose translation is missing, invalid, incomplete
           or stale (made from English text that has changed since); with slugs, the
           state of each named item
  check    validates each named sidecar and exits with code 1 on any problem: invalid
           JSON, missing or extra keys, empty strings, a name another item already
           uses, a field with no Han character where the English has words, ASCII
           , . : ; ? ( ) next to a Han character, or no space between a Han character
           and a Latin letter or digit. Code in backticks is not checked.
  stamp    writes the hash of the current English text into "source", which marks
           the translation as up to date. --all stamps every item that has a sidecar.

Options
  --help   show this text`;

function fail(message) {
  console.error(`i18n: ${message}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
  console.log(HELP);
  process.exit(argv.length === 0 ? 1 : 0);
}

const [command, ...rest] = argv;
const items = readItems();
if (!items) fail("src/registry/__generated__/items.ts is missing. Run pnpm registry.");
const bySlug = new Map(items.map((item) => [item.slug, item]));

function pick(slugs) {
  if (slugs.length === 0) fail(`${command} needs at least one slug. See --help.`);
  for (const arg of slugs) if (arg.startsWith("--")) fail(`Unknown option ${arg}. See --help.`);
  const unknown = slugs.filter((slug) => !bySlug.has(slug));
  if (unknown.length > 0) fail(`Not in the registry: ${unknown.join(", ")}`);
  return slugs.map((slug) => bySlug.get(slug));
}

const rel = (abs) => path.relative(ROOT, abs);

function status(slugs) {
  if (slugs.length > 0) {
    for (const item of pick(slugs)) {
      const state = sidecarState(item);
      const detail =
        state.state === "incomplete"
          ? `: ${state.missing.join(", ")}`
          : state.state === "stale"
            ? `: made from ${state.source ?? "an unstamped text"}, the English is now ${state.hash}`
            : state.state === "invalid"
              ? `: ${state.error}`
              : "";
      console.log(`  ${item.slug}: ${state.state === "ok" ? "up to date" : state.state}${detail}`);
    }
    return;
  }
  const groups = { ok: [], missing: [], invalid: [], incomplete: [], stale: [] };
  for (const item of items) groups[sidecarState(item).state].push(item.slug);
  console.log(
    `${items.length} items: ${groups.ok.length} up to date, ${groups.missing.length} missing, ${groups.invalid.length} invalid, ${groups.incomplete.length} incomplete, ${groups.stale.length} stale`,
  );
  for (const state of ["missing", "invalid", "incomplete", "stale"]) {
    if (groups[state].length === 0) continue;
    console.log(`\n${state} (${groups[state].length})`);
    console.log(`  ${groups[state].join("\n  ")}`);
  }
}

const HAN = /\p{Script=Han}/u;
const PUNCTUATION = /\p{Script=Han}[,.:;?()]|[,.:;?()]\p{Script=Han}/u;
const SPACING = /\p{Script=Han}[A-Za-z0-9]|[A-Za-z0-9]\p{Script=Han}/u;
const withoutCode = (text) => text.replace(/`[^`]*`/g, "\u0000");
const hasWords = (text) => /[A-Za-z]{2,}/.test(withoutCode(text));

function textProblems(field) {
  const problems = [];
  const text = withoutCode(field.value);
  if (hasWords(field.english) && !HAN.test(text)) problems.push("has no Chinese, although the English has words");
  const punctuation = text.match(PUNCTUATION);
  if (punctuation) problems.push(`ASCII punctuation next to a Han character: "${punctuation[0]}"`);
  const spacing = text.match(SPACING);
  if (spacing) problems.push(`no space between Han and Latin or digits: "${spacing[0]}"`);
  return problems;
}

let owners;

function nameOwners() {
  if (owners) return owners;
  owners = new Map();
  for (const other of items) {
    const name = readSidecar(other.slug).data?.name;
    if (typeof name === "string" && name.trim() !== "")
      owners.set(name.trim(), [...(owners.get(name.trim()) ?? []), other.slug]);
  }
  return owners;
}

function checkOne(item) {
  const sidecar = readSidecar(item.slug);
  if (!sidecar.exists) return [`${rel(sidecarPath(item.slug))} does not exist`];
  if (sidecar.error) return [`invalid JSON: ${sidecar.error}`];
  const data = sidecar.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return ["the file must hold a JSON object"];
  const problems = extraKeys(item, data).map((key) => `extra key ${key}`);
  if (typeof data.source !== "string" || data.source.trim() === "") problems.push('missing key source (run "stamp")');
  for (const field of sidecarFields(item, data)) {
    if (field.value === undefined) problems.push(`missing key ${field.key}`);
    else if (typeof field.value !== "string") problems.push(`${field.key} must be a string`);
    else if (field.value.trim() === "") problems.push(`${field.key} is empty`);
    else for (const problem of textProblems(field)) problems.push(`${field.key} ${problem}`);
  }
  if (typeof data.name === "string") {
    const others = (nameOwners().get(data.name.trim()) ?? []).filter((slug) => slug !== item.slug);
    if (others.length > 0) problems.push(`name "${data.name}" is also used by ${others.join(", ")}`);
  }
  return problems;
}

function check(slugs) {
  let failed = 0;
  for (const item of pick(slugs)) {
    const problems = checkOne(item);
    const state = sidecarState(item);
    if (problems.length === 0) {
      const note =
        state.state === "stale" ? ` (stale: the English is now ${state.hash}; stamp it once it matches)` : "";
      console.log(`  ✓ ${item.slug}${note}`);
      continue;
    }
    failed++;
    console.error(`  ✗ ${item.slug}`);
    for (const problem of problems) console.error(`      ${problem}`);
  }
  if (failed > 0) {
    console.error(`i18n: ${failed} of ${slugs.length} failed`);
    process.exit(1);
  }
}

function stamp(args) {
  const targets = args.includes("--all") ? items.filter((item) => readSidecar(item.slug).exists) : pick(args);
  let stamped = 0;
  for (const item of targets) {
    const sidecar = readSidecar(item.slug);
    if (!sidecar.exists) fail(`${rel(sidecarPath(item.slug))} does not exist`);
    if (sidecar.error) fail(`${rel(sidecarPath(item.slug))} is not valid JSON: ${sidecar.error}`);
    const { source: _, ...fields } = sidecar.data;
    const next = `${JSON.stringify({ source: sourceHash(item), ...fields }, null, 2)}\n`;
    if (next === sidecar.text) continue;
    fs.writeFileSync(sidecarPath(item.slug), next);
    stamped++;
    console.log(`  stamped ${item.slug} ${sourceHash(item)}`);
  }
  console.log(`i18n: ${stamped} stamped, ${targets.length - stamped} already current`);
}

switch (command) {
  case "status":
    status(rest);
    break;
  case "check":
    check(rest);
    break;
  case "stamp":
    stamp(rest);
    break;
  default:
    fail(`Unknown command ${command}. See --help.`);
}

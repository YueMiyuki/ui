import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ITEMS_DIR = path.join(ROOT, "src", "registry", "items");
export const SIDECAR = "meta.zh.json";
export const SIDECAR_KEYS = ["source", "name", "description", "demos", "props"];

export const sidecarPath = (slug) => path.join(ITEMS_DIR, slug, SIDECAR);

export function englishTexts(item) {
  return [
    item.name,
    item.description,
    ...item.demos.map((demo) => demo.title),
    ...item.props.flatMap((group) => group.props.map((prop) => prop.description)),
  ];
}

export function sourceHash(item) {
  return createHash("sha256")
    .update(JSON.stringify(englishTexts(item)))
    .digest("hex")
    .slice(0, 8);
}

export function readSidecar(slug) {
  let text;
  try {
    text = fs.readFileSync(sidecarPath(slug), "utf8");
  } catch {
    return { exists: false };
  }
  try {
    return { exists: true, text, data: JSON.parse(text) };
  } catch (error) {
    return { exists: true, text, error: error.message };
  }
}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const filled = (value) => typeof value === "string" && value.trim().length > 0;

export function sidecarFields(item, data) {
  const fields = [
    { key: "name", english: item.name, value: data?.name },
    { key: "description", english: item.description, value: data?.description },
  ];
  for (const demo of item.demos) {
    fields.push({ key: `demos.${demo.name}`, english: demo.title, value: data?.demos?.[demo.name] });
  }
  for (const group of item.props) {
    for (const prop of group.props) {
      fields.push({
        key: `props.${group.component}.${prop.name}`,
        english: prop.description,
        value: data?.props?.[group.component]?.[prop.name],
      });
    }
  }
  return fields;
}

export function extraKeys(item, data) {
  if (!isObject(data)) return [];
  const extra = Object.keys(data).filter((key) => !SIDECAR_KEYS.includes(key));
  if (isObject(data.demos)) {
    const names = new Set(item.demos.map((demo) => demo.name));
    for (const key of Object.keys(data.demos)) if (!names.has(key)) extra.push(`demos.${key}`);
  } else if (data.demos !== undefined) extra.push("demos (not an object)");
  if (isObject(data.props)) {
    const groups = new Map(item.props.map((group) => [group.component, new Set(group.props.map((prop) => prop.name))]));
    for (const [component, props] of Object.entries(data.props)) {
      const known = groups.get(component);
      if (!known) {
        extra.push(`props.${component}`);
        continue;
      }
      if (!isObject(props)) {
        extra.push(`props.${component} (not an object)`);
        continue;
      }
      for (const key of Object.keys(props)) if (!known.has(key)) extra.push(`props.${component}.${key}`);
    }
  } else if (data.props !== undefined) extra.push("props (not an object)");
  return extra;
}

export function sidecarState(item) {
  const sidecar = readSidecar(item.slug);
  if (!sidecar.exists) return { state: "missing" };
  if (sidecar.error) return { state: "invalid", error: sidecar.error };
  if (!isObject(sidecar.data)) return { state: "invalid", error: "the file must hold a JSON object" };
  const data = sidecar.data;
  const missing = sidecarFields(item, data)
    .filter((field) => !filled(field.value))
    .map((field) => field.key);
  if (missing.length > 0) return { state: "incomplete", data, missing };
  const hash = sourceHash(item);
  if (data.source !== hash) return { state: "stale", data, source: data.source, hash };
  return { state: "ok", data };
}

export function translationOf(item, data) {
  const out = {};
  if (filled(data.name)) out.name = data.name;
  if (filled(data.description)) out.description = data.description;
  const demos = {};
  for (const demo of item.demos) if (filled(data.demos?.[demo.name])) demos[demo.name] = data.demos[demo.name];
  if (Object.keys(demos).length > 0) out.demos = demos;
  const props = {};
  for (const group of item.props) {
    const entries = group.props
      .filter((prop) => filled(data.props?.[group.component]?.[prop.name]))
      .map((prop) => [prop.name, data.props[group.component][prop.name]]);
    if (entries.length > 0) props[group.component] = Object.fromEntries(entries);
  }
  if (Object.keys(props).length > 0) out.props = props;
  return out;
}

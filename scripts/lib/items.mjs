import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function readItems() {
  const file = path.join(ROOT, "src", "registry", "__generated__", "items.ts");
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  const start = text.indexOf("= [", text.indexOf("export const items")) + 2;
  const end = text.lastIndexOf("]");
  return JSON.parse(text.slice(start, end + 1));
}

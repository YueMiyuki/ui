#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src", "site", "fonts", "pixel-cjk.woff2");
const DICTIONARIES = ["en.ts", "zh.ts"].map((file) => path.join(ROOT, "src", "site", "i18n", file));
const FAMILY = "Miyuki Pixel CJK";
const PYTHON = process.env.PYTHON || "python3";

const HELP = `Usage: node scripts/pixel-cjk.mjs <path-to-source-font>

Subsets the CJK pixel face used for the Chinese hero to the characters of every
dictionary string set in font-pixel (the "pixel" group of src/site/i18n/en.ts and
zh.ts), renames it to "${FAMILY}" in every name record, as the OFL requires of a
Modified Version, and writes ${path.relative(ROOT, OUT)}.

The source is Fusion Pixel 12px Proportional SC by TakWolf (OFL-1.1), for example
fusion-pixel-12px-proportional-zh_hans.otf.woff2 from the project's releases. Keep
src/site/fonts/OFL.txt beside the subset.

Needs Python with fonttools and brotli. A throwaway venv works:
  python3 -m venv /tmp/fonttools && /tmp/fonttools/bin/pip install fonttools brotli
  PYTHON=/tmp/fonttools/bin/python node scripts/pixel-cjk.mjs <path-to-source-font>

Env: PYTHON (default python3)`;

function fail(message) {
  console.error(`pixel-cjk: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(HELP);
  process.exit(0);
}
if (args.length !== 1) fail("give the path to the source font. See --help.");
const source = path.resolve(args[0]);
if (!fs.existsSync(source)) fail(`${source} does not exist`);

const probe = spawnSync(PYTHON, ["-c", "import fontTools.subset, brotli"], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  fail(
    `${PYTHON} cannot import fontTools and brotli. Install them with "pip install fonttools brotli" (a venv in a temp folder is fine) and set PYTHON to that interpreter. See --help.`,
  );
}

process.removeAllListeners("warning");
const strings = [];
for (const file of DICTIONARIES) {
  const module = await import(pathToFileURL(file).href);
  const dictionary = Object.values(module).find((value) => value && typeof value === "object" && "pixel" in value);
  if (!dictionary) fail(`${path.relative(ROOT, file)} exports no dictionary with a "pixel" group`);
  strings.push(...Object.values(dictionary.pixel));
}
const characters = [...new Set(strings.join(""))].filter((char) => char.codePointAt(0) > 0x7f).sort();
if (characters.length === 0) fail("the pixel strings hold no characters beyond ASCII; nothing to subset");

const rename = `
import sys
from fontTools.ttLib import TTFont
path, family = sys.argv[1], sys.argv[2]
font = TTFont(path)
names = font["name"]
style = (names.getDebugName(2) or "Regular").strip()
version = (names.getDebugName(5) or "").strip()
postscript = family.replace(" ", "") + "-" + style.replace(" ", "")
for record in names.names:
    if record.nameID in (1, 16, 21):
        record.string = family
    elif record.nameID == 4:
        record.string = family + " " + style
    elif record.nameID == 6:
        record.string = postscript
    elif record.nameID == 3:
        record.string = postscript + (";" + version if version else "")
    elif record.nameID in (18,):
        record.string = family + " " + style
if "CFF " in font:
    cff = font["CFF "].cff
    cff.fontNames = [postscript]
    top = cff.topDictIndex[0]
    top.FamilyName = family
    top.FullName = family + " " + style
font.save(path)
for record in names.names:
    if "fusion" in record.toUnicode().lower() and record.nameID not in (0, 11, 13, 14):
        print("left:", record.nameID, record.toUnicode())
print(names.getDebugName(1) + " / " + names.getDebugName(4) + " / " + names.getDebugName(6))
`;

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pixel-cjk-"));
const subset = path.join(temp, "subset.woff2");
const run = (argv) => {
  const result = spawnSync(PYTHON, argv, { encoding: "utf8" });
  if (result.error || result.status !== 0) fail(result.stderr || String(result.error));
  return result.stdout.trim();
};
run([
  "-m",
  "fontTools.subset",
  source,
  `--text=${characters.join("")}`,
  `--output-file=${subset}`,
  "--flavor=woff2",
  "--layout-features=*",
  "--name-IDs=*",
  "--name-languages=*",
  "--notdef-outline",
]);
const names = run(["-c", rename, subset, FAMILY]);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.copyFileSync(subset, OUT);
fs.rmSync(temp, { recursive: true, force: true });
console.log(
  `pixel-cjk: ${characters.length} characters (${characters.join("")}), ${fs.statSync(OUT).size} bytes, ${names}`,
);
console.log(`pixel-cjk: wrote ${path.relative(ROOT, OUT)}`);

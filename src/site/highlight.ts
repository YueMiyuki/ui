import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { createHighlighter, createJavaScriptRegexEngine, type Highlighter } from "shiki";
import { codeTheme } from "@/site/code-theme";

export type CodeLang = "tsx" | "ts" | "css" | "json" | "bash";

let highlighter: Promise<Highlighter> | null = null;

function getHighlighter() {
  highlighter ??= createHighlighter({
    themes: [codeTheme],
    langs: ["tsx", "ts", "css", "json", "bash"],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

function langFor(file: string): CodeLang {
  const ext = path.extname(file).slice(1);
  if (ext === "ts" || ext === "css" || ext === "json") return ext;
  if (ext === "sh") return "bash";
  return "tsx";
}

export async function highlight(code: string, lang: CodeLang): Promise<string> {
  "use cache";
  cacheLife("max");
  const h = await getHighlighter();
  return h.codeToHtml(code.replace(/\n+$/, ""), { lang, theme: "miyuki" });
}

export interface SourceFile {
  path: string;
  code: string;
  html: string;
}

function version(relPath: string): number {
  try {
    return fs.statSync(path.join(process.cwd(), "src", relPath)).mtimeMs;
  } catch {
    return 0;
  }
}

async function readSourceCached(relPath: string, mtime: number): Promise<SourceFile> {
  "use cache";
  cacheLife("max");
  void mtime;
  const code = await readFile(path.join(process.cwd(), "src", relPath), "utf8");
  return { path: relPath, code, html: await highlight(code, langFor(relPath)) };
}

export function readSource(relPath: string): Promise<SourceFile> {
  return readSourceCached(relPath, version(relPath));
}

function topLevelStatements(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        out.push(css.slice(start, i + 1).trim());
        start = i + 1;
      }
    } else if (c === ";" && depth === 0) {
      out.push(css.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  return out.filter(Boolean);
}

const siteOnly = /@import|fd-|#nd-|\.prose\b/;

export async function readThemeTokens(): Promise<{ code: string; html: string }> {
  "use cache";
  cacheLife("max");
  const css = await readFile(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");
  const code = topLevelStatements(css.replace(/\/\*[\s\S]*?\*\//g, ""))
    .filter((statement) => !siteOnly.test(statement))
    .join("\n\n");
  return { code, html: await highlight(code, "css") };
}

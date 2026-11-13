"use client";

import { FileCode2 } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, useEffect, useId, useRef, useState } from "react";
import { type Key, Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import type { HighlighterCore, ThemedToken } from "shiki/core";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export interface CodeBlockTab {
  name: string;
  code: string;
  language?: string;
  highlightLines?: number[];
}

export interface CodeBlockProps extends Omit<ComponentProps<"div">, "children"> {
  code?: string;
  language?: string;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  tabs?: CodeBlockTab[];
  labels?: { copy?: string; copied?: string; tabs?: string };
}

const THEME = "miyuki-code-block";

const ink = (hue: string, share = 65) => `color-mix(in oklab, ${hue} ${share}%, var(--foreground))`;

const FALLBACKS: Record<string, string> = {
  foreground: "var(--foreground)",
  background: "transparent",
  "token-constant": ink("oklch(0.62 0.19 18)"),
  "token-string": ink("oklch(0.62 0.12 165)"),
  "token-comment": "var(--muted-foreground)",
  "token-keyword": ink("oklch(0.6 0.16 295)"),
  "token-parameter": ink("oklch(0.6 0.08 248)", 40),
  "token-function": ink("oklch(0.6 0.14 240)"),
  "token-string-expression": ink("oklch(0.62 0.12 165)"),
  "token-punctuation": "var(--muted-foreground)",
  "token-link": ink("oklch(0.6 0.14 240)"),
};

let highlighter: Promise<HighlighterCore> | undefined;
const grammars = new Map<string, Promise<boolean>>();
const highlighted = new Map<string, ThemedToken[][]>();

function loadHighlighter() {
  highlighter ??= Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(([core, engine]) =>
    core.createHighlighterCore({
      themes: [core.createCssVariablesTheme({ name: THEME, variableDefaults: FALLBACKS })],
      langs: [],
      engine: engine.createJavaScriptRegexEngine(),
    }),
  );
  return highlighter;
}

function loadGrammar(shiki: HighlighterCore, language: string) {
  let pending = grammars.get(language);
  if (!pending) {
    pending = import("shiki/langs")
      .then(async ({ bundledLanguages }) => {
        const grammar = bundledLanguages[language as keyof typeof bundledLanguages];
        if (!grammar) return false;
        await shiki.loadLanguage(grammar);
        return true;
      })
      .catch(() => false);
    grammars.set(language, pending);
  }
  return pending;
}

async function tokenize(key: string, code: string, language: string) {
  const shiki = await loadHighlighter();
  if (!(await loadGrammar(shiki, language))) return null;
  const lines = shiki.codeToTokensBase(code, { lang: language, theme: THEME });
  if (highlighted.size > 64) highlighted.delete(highlighted.keys().next().value!);
  highlighted.set(key, lines);
  return lines;
}

function useTokens(code: string, language: string | undefined) {
  const key = `${language ?? ""}\u0000${code}`;
  const [result, setResult] = useState<{ key: string; lines: ThemedToken[][] } | null>(null);

  useEffect(() => {
    if (!language || language === "text" || language === "plaintext") return;
    let live = true;
    if (highlighted.has(key)) return;
    tokenize(key, code, language.toLowerCase())
      .then((lines) => {
        if (live && lines) setResult({ key, lines });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [code, language, key]);

  return result?.key === key ? result.lines : (highlighted.get(key) ?? null);
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function CopyButton({ text, labels }: { text: string; labels?: CodeBlockProps["labels"] }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    if (!(await writeClipboard(text))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={copied ? (labels?.copied ?? "Copied") : (labels?.copy ?? "Copy code")}
        onPress={copy}
        className={cn(
          "rounded-md text-muted-foreground data-[hovered]:text-foreground",
          copied && "text-brand data-[hovered]:text-brand",
        )}
      >
        <MorphIcon shapes={morphIcons.copyCheck} shape={copied ? "check" : "copy"} />
      </IconButton>
      <span aria-live="polite" className="sr-only">
        {copied ? (labels?.copied ?? "Copied") : ""}
      </span>
    </>
  );
}

function tokenStyle(token: ThemedToken) {
  const style = token.fontStyle ?? 0;
  return {
    color: token.color,
    fontStyle: style & 1 ? "italic" : undefined,
    fontWeight: style & 2 ? 600 : undefined,
    textDecoration: style & 4 ? "underline" : undefined,
  } as const;
}

function CodeView({
  code,
  language,
  highlightLines,
  showLineNumbers,
}: {
  code: string;
  language?: string;
  highlightLines?: number[];
  showLineNumbers: boolean;
}) {
  const source = code.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  const tokens = useTokens(source, language);
  const plain = source.split("\n");
  const marked = new Set(highlightLines);

  return (
    <div className="flex font-mono text-[13px] leading-[1.6]">
      <div
        aria-hidden="true"
        className={cn(
          "shrink-0 py-3.5 text-right text-muted-foreground/75 tabular-nums select-none",
          !showLineNumbers && "w-0",
        )}
      >
        {plain.map((_, i) => (
          <div
            key={i}
            className={cn(
              "relative min-h-[1lh]",
              showLineNumbers && "pr-1 pl-4",
              marked.has(i + 1) &&
                "bg-brand/[0.08] text-brand-strong before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand",
            )}
          >
            {showLineNumbers ? i + 1 : null}
          </div>
        ))}
      </div>
      <pre className="min-w-0 flex-1 overflow-x-auto py-3.5 [scrollbar-width:thin]">
        <code className="grid w-max min-w-full text-[var(--shiki-foreground,var(--foreground))]">
          {plain.map((line, i) => (
            <span
              key={i}
              className={cn(
                "block min-h-[1lh] pr-5",
                showLineNumbers ? "pl-4" : "pl-5",
                marked.has(i + 1) && "bg-brand/[0.08]",
              )}
            >
              {tokens?.[i]
                ? tokens[i].map((token, j) => (
                    <span key={j} style={tokenStyle(token)}>
                      {token.content}
                    </span>
                  ))
                : line}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const surface = "overflow-clip rounded-xl border border-border bg-muted/50 text-foreground";
const header = "flex h-10 items-center gap-2 border-b border-border pr-1.5";

export function CodeBlock({
  code = "",
  language,
  filename,
  highlightLines,
  showLineNumbers = false,
  tabs,
  labels,
  className,
  ...props
}: CodeBlockProps) {
  const group = useId();
  const reduced = useReducedMotion() ?? false;
  const [selected, setSelected] = useState<Key>("0");

  if (tabs && tabs.length > 0) {
    const index = Math.min(tabs.length - 1, Math.max(0, Number(selected) || 0));
    return (
      <div {...props} className={cn(surface, className)}>
        <style href="miyuki-code-block" precedence="miyuki">{`
          @keyframes miyuki-code-block-in { from { opacity: 0; } }
        `}</style>
        <Tabs selectedKey={String(index)} onSelectionChange={setSelected}>
          <div className={header}>
            <LayoutGroup id={group}>
              <TabList
                aria-label={labels?.tabs ?? "Files"}
                className="flex min-w-0 flex-1 self-stretch overflow-x-auto px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {tabs.map((tab, i) => (
                  <Tab
                    key={i}
                    id={String(i)}
                    className={cn(
                      "relative flex shrink-0 cursor-default items-center px-2.5 text-[13px] font-medium whitespace-nowrap outline-none select-none",
                      "text-muted-foreground transition-colors duration-150 data-[hovered]:text-foreground data-[selected]:text-foreground",
                      "after:pointer-events-none after:absolute after:inset-x-0.5 after:inset-y-2 after:rounded-md after:transition-shadow",
                      "data-[focus-visible]:after:ring-[3px] data-[focus-visible]:after:ring-ring",
                    )}
                  >
                    {({ isSelected }) => (
                      <>
                        {tab.name}
                        {isSelected ? (
                          <motion.span
                            layoutId="underline"
                            aria-hidden="true"
                            className="absolute inset-x-2.5 -bottom-px h-0.5 bg-brand"
                            style={{ borderRadius: 1 }}
                            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                          />
                        ) : null}
                      </>
                    )}
                  </Tab>
                ))}
              </TabList>
            </LayoutGroup>
            <CopyButton key={index} text={tabs[index].code} labels={labels} />
          </div>
          {tabs.map((tab, i) => (
            <TabPanel
              key={i}
              id={String(i)}
              className={cn(
                "outline-none data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[focus-visible]:ring-inset",
                "data-[entering]:animate-[miyuki-code-block-in_160ms_ease-out]",
              )}
            >
              <CodeView
                code={tab.code}
                language={tab.language ?? language}
                highlightLines={tab.highlightLines}
                showLineNumbers={showLineNumbers}
              />
            </TabPanel>
          ))}
        </Tabs>
      </div>
    );
  }

  return (
    <div {...props} className={cn(surface, className)}>
      {filename ? (
        <div className={cn(header, "pl-4")}>
          <FileCode2 aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{filename}</span>
          <CopyButton text={code} labels={labels} />
        </div>
      ) : null}
      <div className="relative">
        <CodeView code={code} language={language} highlightLines={highlightLines} showLineNumbers={showLineNumbers} />
        {filename ? null : (
          <div className="absolute top-2 right-2">
            <CopyButton text={code} labels={labels} />
          </div>
        )}
      </div>
    </div>
  );
}

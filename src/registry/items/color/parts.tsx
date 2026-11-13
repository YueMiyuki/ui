"use client";

import { type CSSProperties, type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import { onThemeChange } from "@/components/miyuki-ui/lib/color";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";
import { type Pair, type Resolved, resolve, type Token } from "./palette";

const v = (name: string) => `var(--${name})`;

export function useResolved(ref: RefObject<HTMLElement | null>) {
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setResolved(resolve(el)));
    };
    read();
    const stop = onThemeChange(read);
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [ref]);

  return resolved;
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

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState({ text: "", n: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string, key: string = text) => {
    const ok = await writeClipboard(text);
    clearTimeout(timer.current);
    setCopied(ok ? key : null);
    setMessage((m) => ({ text: ok ? `Copied ${text}` : `Could not copy ${text}`, n: m.n + 1 }));
    timer.current = setTimeout(() => setCopied(null), 1600);
  }, []);

  const live = (
    <p aria-live="polite" className="sr-only">
      {message.text}
      {message.n % 2 ? " " : ""}
    </p>
  );

  return { copied, copy, live };
}

function CopyIcon({ copied, className }: { copied: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 transition-opacity duration-200",
        copied ? "opacity-100" : "opacity-0 group-data-[focus-visible]:opacity-80 group-data-[hovered]:opacity-80",
        className,
      )}
    >
      <MorphIcon shapes={morphIcons.copyCheck} shape={copied ? "check" : "copy"} size={16} />
    </span>
  );
}

const copiedLine = "block font-sans text-xs font-semibold";

export function SectionHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <header className="max-w-2xl">
      <h2 id={id} className="text-xl font-semibold tracking-[-0.015em] text-foreground">
        {title}
      </h2>
      {children ? <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{children}</p> : null}
    </header>
  );
}

function Chip({ token }: { token: Token }) {
  const color = v(token.name);
  const base = "size-12 shrink-0 rounded-lg";
  if (token.kind === "text") {
    return (
      <span
        aria-hidden="true"
        style={{ background: v(token.on ?? "background"), color }}
        className={cn(
          base,
          "grid place-items-center text-lg font-semibold tracking-[-0.01em] ring-1 ring-foreground/10 ring-inset",
        )}
      >
        Aa
      </span>
    );
  }
  if (token.kind === "border") {
    return (
      <span aria-hidden="true" style={{ borderColor: color }} className={cn(base, "relative border bg-card")}>
        <span style={{ background: color }} className="absolute inset-x-0 top-1/2 h-px" />
      </span>
    );
  }
  if (token.kind === "ring") {
    return (
      <span
        aria-hidden="true"
        style={{ boxShadow: `0 0 0 3px ${color}` }}
        className={cn(base, "m-[3px] size-[42px] border border-brand bg-card")}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ background: color }}
      className={cn(base, "ring-1 ring-foreground/10 ring-inset")}
    />
  );
}

export function Swatch({
  token,
  value,
  copied,
  onCopy,
}: {
  token: Token;
  value: string | undefined;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Button
      onPress={onCopy}
      aria-label={`Copy ${token.utility}`}
      className={cn(
        "group -m-2 flex min-w-0 flex-1 items-center gap-3.5 rounded-xl p-2 text-left outline-none transition-colors duration-200 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
        copied ? "bg-brand-soft" : "data-[hovered]:bg-accent/70",
      )}
    >
      <Chip token={token} />
      <span className="min-w-0 flex-1 font-mono text-xs leading-[1.45]">
        <span className="block truncate text-[13px] font-medium text-foreground">{token.utility}</span>
        {copied ? (
          <span className={cn(copiedLine, "text-brand-strong")}>Copied</span>
        ) : (
          <span className="block truncate text-muted-foreground">--{token.name}</span>
        )}
        <span className="block truncate text-muted-foreground">{value || " "}</span>
      </span>
      <CopyIcon
        copied={copied}
        className={cn("self-start pt-0.5", copied ? "text-brand-strong" : "text-muted-foreground")}
      />
    </Button>
  );
}

export function NamedTile({
  name,
  fill,
  fg,
  copied,
  onCopy,
}: {
  name: string;
  fill: string;
  fg: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Button
      onPress={onCopy}
      aria-label={`${name}, copy bg-${fill}`}
      style={{ background: v(fill), color: v(fg) } as CSSProperties}
      className="group flex h-28 w-full flex-col justify-between rounded-2xl border border-foreground/10 p-4 text-left outline-none transition-[transform,box-shadow] duration-200 ease-settle data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:shadow-md data-[pressed]:scale-[0.98] @2xl:h-36 @2xl:p-5"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-display text-xl leading-none font-semibold tracking-[-0.025em] @2xl:text-2xl">
          {name}
        </span>
        <CopyIcon copied={copied} />
      </span>
      {copied ? <span className={copiedLine}>Copied</span> : <span className="font-mono text-xs">bg-{fill}</span>}
    </Button>
  );
}

function Grade({ ratio }: { ratio: number | undefined }) {
  if (ratio == null) return null;
  if (ratio < 4.5) {
    return (
      <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-medium text-destructive-strong">
        Below 4.5:1
      </span>
    );
  }
  return <span className="text-xs font-medium text-muted-foreground">{ratio >= 7 ? "AAA" : "AA"}</span>;
}

export function PairTile({
  pair,
  ratio,
  copied,
  onCopy,
}: {
  pair: Pair;
  ratio: number | undefined;
  copied: boolean;
  onCopy: () => void;
}) {
  const shown = ratio == null ? null : (Math.floor(ratio * 100) / 100).toFixed(2);
  return (
    <div className="min-w-0">
      <Button
        onPress={onCopy}
        aria-label={`Copy bg-${pair.fill} text-${pair.fg}`}
        style={{ background: v(pair.fill), color: v(pair.fg) }}
        className="group flex h-32 w-full flex-col justify-between rounded-xl border border-foreground/10 p-4 text-left outline-none transition-[transform,box-shadow] duration-200 ease-settle data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:shadow-md data-[pressed]:scale-[0.98]"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="text-[15px] leading-snug font-medium">{pair.sample}</span>
          <CopyIcon copied={copied} className="pt-0.5" />
        </span>
        <span className="min-w-0 font-mono text-xs leading-[1.5]">
          {copied ? (
            <span className={copiedLine}>Copied</span>
          ) : (
            <>
              <span className="block truncate">bg-{pair.fill}</span>
              <span className="block truncate">text-{pair.fg}</span>
            </>
          )}
        </span>
      </Button>
      <p className="mt-2.5 flex min-h-6 items-center justify-between gap-3 px-0.5">
        <span className="text-sm font-medium text-foreground tabular-nums">
          {shown ? (
            <>
              {shown}
              <span className="text-muted-foreground">:1</span>
            </>
          ) : null}
        </span>
        <Grade ratio={ratio} />
      </p>
    </div>
  );
}

export function ShadowTile({
  utility,
  use,
  copied,
  onCopy,
}: {
  utility: string;
  use: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Button
      onPress={onCopy}
      aria-label={`Copy ${utility}`}
      className={cn(
        "group relative flex h-28 min-w-0 flex-col justify-between rounded-xl bg-card p-3.5 text-left outline-none transition-transform duration-200 ease-settle data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[pressed]:scale-[0.98] dark:bg-popover @2xl:h-32 @2xl:p-4",
        utility,
      )}
    >
      <span className="font-mono text-[13px] font-medium whitespace-nowrap text-foreground">{utility}</span>
      <CopyIcon
        copied={copied}
        className={cn(
          "absolute top-3.5 right-3.5 @2xl:top-4 @2xl:right-4",
          copied ? "text-brand-strong" : "text-muted-foreground",
        )}
      />
      {copied ? (
        <span className={cn(copiedLine, "text-brand-strong")}>Copied</span>
      ) : (
        <span className="text-[13px] leading-snug text-muted-foreground">{use}</span>
      )}
    </Button>
  );
}

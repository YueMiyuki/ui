"use client";

import {
  type ComponentProps,
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";

export type KbdSize = "sm" | "md";
export type KbdVariant = "keycap" | "flat" | "inverse";
export type KbdPlatform = "auto" | "apple" | "other";

const sizes: Record<KbdSize, string> = {
  sm: "h-5 min-w-5 px-1 text-[11px]",
  md: "h-6 min-w-6 px-1.5 text-xs",
};

const variants: Record<KbdVariant, string> = {
  keycap:
    "border border-border-strong bg-card text-muted-foreground shadow-[inset_0_-1px_0_var(--border)] data-[pressed]:text-foreground data-[pressed]:shadow-none",
  flat: "bg-muted text-muted-foreground data-[pressed]:text-foreground",
  inverse: "bg-primary-foreground/15 text-primary-foreground data-[pressed]:bg-primary-foreground/25",
};

const separators: Record<KbdVariant, string> = {
  keycap: "text-muted-foreground",
  flat: "text-muted-foreground",
  inverse: "text-primary-foreground/70",
};

export interface KbdProps extends ComponentProps<"kbd"> {
  size?: KbdSize;
  variant?: KbdVariant;
  isPressed?: boolean;
}

export function Kbd({ size = "md", variant = "keycap", isPressed = false, className, ...props }: KbdProps) {
  return (
    <kbd
      data-pressed={isPressed || undefined}
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm font-mono leading-none font-normal whitespace-nowrap select-none",
        "transition-[translate,box-shadow,color,background-color] duration-100 ease-settle data-[pressed]:translate-y-px",
        sizes[size],
        variants[variant],
        className,
      )}
    />
  );
}

type Flag = "metaKey" | "ctrlKey" | "altKey" | "shiftKey";

interface KeyEntry {
  apple: string;
  other: string;
  appleName?: string;
  name: string;
  key?: string;
  flag?: Flag | "mod";
}

const aliases: Record<string, string> = {
  cmd: "meta",
  command: "meta",
  "⌘": "meta",
  super: "meta",
  win: "meta",
  control: "ctrl",
  "⌃": "ctrl",
  option: "alt",
  opt: "alt",
  "⌥": "alt",
  "⇧": "shift",
  return: "enter",
  "↵": "enter",
  "⏎": "enter",
  escape: "esc",
  "⇥": "tab",
  "⌫": "backspace",
  del: "delete",
  "⌦": "delete",
  up: "arrowup",
  "↑": "arrowup",
  down: "arrowdown",
  "↓": "arrowdown",
  left: "arrowleft",
  "←": "arrowleft",
  right: "arrowright",
  "→": "arrowright",
  pgup: "pageup",
  pgdn: "pagedown",
  spacebar: "space",
  caps: "capslock",
};

const entries: Record<string, KeyEntry> = {
  mod: { apple: "⌘", other: "Ctrl", appleName: "Command", name: "Control", flag: "mod" },
  meta: { apple: "⌘", other: "Meta", appleName: "Command", name: "Meta", flag: "metaKey" },
  ctrl: { apple: "⌃", other: "Ctrl", name: "Control", flag: "ctrlKey" },
  alt: { apple: "⌥", other: "Alt", appleName: "Option", name: "Alt", flag: "altKey" },
  shift: { apple: "⇧", other: "Shift", name: "Shift", flag: "shiftKey" },
  enter: { apple: "↵", other: "Enter", appleName: "Return", name: "Enter", key: "Enter" },
  esc: { apple: "esc", other: "Esc", name: "Escape", key: "Escape" },
  tab: { apple: "⇥", other: "Tab", name: "Tab", key: "Tab" },
  backspace: { apple: "⌫", other: "Backspace", appleName: "Delete", name: "Backspace", key: "Backspace" },
  delete: { apple: "⌦", other: "Del", appleName: "Forward Delete", name: "Delete", key: "Delete" },
  space: { apple: "Space", other: "Space", name: "Space", key: " " },
  arrowup: { apple: "↑", other: "↑", name: "Up Arrow", key: "ArrowUp" },
  arrowdown: { apple: "↓", other: "↓", name: "Down Arrow", key: "ArrowDown" },
  arrowleft: { apple: "←", other: "←", name: "Left Arrow", key: "ArrowLeft" },
  arrowright: { apple: "→", other: "→", name: "Right Arrow", key: "ArrowRight" },
  home: { apple: "Home", other: "Home", name: "Home", key: "Home" },
  end: { apple: "End", other: "End", name: "End", key: "End" },
  pageup: { apple: "PgUp", other: "PgUp", name: "Page Up", key: "PageUp" },
  pagedown: { apple: "PgDn", other: "PgDn", name: "Page Down", key: "PageDown" },
  capslock: { apple: "⇪", other: "Caps Lock", name: "Caps Lock", key: "CapsLock" },
};

const punctuation: Record<string, string> = {
  ".": "Period",
  ",": "Comma",
  "/": "Slash",
  ";": "Semicolon",
  "'": "Quote",
  "[": "BracketLeft",
  "]": "BracketRight",
  "-": "Minus",
  "=": "Equal",
  "`": "Backquote",
  "\\": "Backslash",
};

const symbolGlyph = /^[⌘⌃⌥⇧↵⇥⌫⌦⇪↑↓←→]$/;

interface ComboKey {
  label: string;
  name: string;
  flag?: Flag;
  shifted?: boolean;
  test?: (event: KeyboardEvent) => boolean;
}

function describeKey(raw: string, apple: boolean): ComboKey {
  const lower = raw.toLowerCase();
  const id = aliases[lower] ?? aliases[raw] ?? lower;
  const entry = entries[id];
  if (entry) {
    const flag = entry.flag === "mod" ? (apple ? "metaKey" : "ctrlKey") : entry.flag;
    const key = entry.key;
    return {
      label: apple ? entry.apple : entry.other,
      name: apple ? (entry.appleName ?? entry.name) : entry.name,
      flag,
      test: key ? (event) => event.key === key || (key === " " && event.code === "Space") : undefined,
    };
  }
  if (/^f\d{1,2}$/.test(lower)) {
    const label = lower.toUpperCase();
    return { label, name: label, test: (event) => event.key.toUpperCase() === label };
  }
  if (raw.length === 1) {
    const label = raw.toUpperCase();
    const code = /[a-z]/i.test(raw) ? `Key${label}` : /\d/.test(raw) ? `Digit${raw}` : punctuation[raw];
    return {
      label,
      name: label,
      shifted: !/[a-z0-9]/i.test(raw),
      test: (event) => event.key.toLowerCase() === lower || event.code === code,
    };
  }
  const label = raw.charAt(0).toUpperCase() + raw.slice(1);
  return { label, name: label, test: (event) => event.key.toLowerCase() === lower };
}

function splitKeys(keys: string) {
  return keys
    .split(/\+(?=.)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const noSubscription = () => () => {};

function readApple() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent);
}

function useApple(platform: KbdPlatform) {
  const detected = useSyncExternalStore(noSubscription, readApple, () => true);
  return platform === "auto" ? detected : platform === "apple";
}

const allFlags: Flag[] = ["metaKey", "ctrlKey", "altKey", "shiftKey"];

export interface KbdComboProps extends Omit<ComponentProps<"kbd">, "children"> {
  keys: string;
  size?: KbdSize;
  variant?: KbdVariant;
  separator?: ReactNode;
  listen?: boolean;
  platform?: KbdPlatform;
}

export function KbdCombo({
  keys,
  size = "md",
  variant = "keycap",
  separator,
  listen = false,
  platform = "auto",
  className,
  ...props
}: KbdComboProps) {
  const apple = useApple(platform);
  const combo = useMemo(() => splitKeys(keys).map((part) => describeKey(part, apple)), [keys, apple]);
  const [held, setHeld] = useState(0);
  const ring = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!listen || combo.length === 0) return;
    const full = (1 << combo.length) - 1;
    const down = new Set<number>();
    const byCode = new Map<string, number[]>();
    const comboFlags = new Set(combo.map((k) => k.flag).filter(Boolean));
    if (combo.some((k) => k.shifted)) comboFlags.add("shiftKey");
    let complete = false;

    function publish(pressing: boolean, event?: KeyboardEvent) {
      let mask = 0;
      for (const i of down) mask |= 1 << i;
      const all = mask === full;
      const exact = !event || allFlags.every((flag) => comboFlags.has(flag) || !event[flag]);
      if (all && exact && pressing && !complete) flash();
      complete = all;
      setHeld(mask);
    }

    function syncFlags(event: KeyboardEvent) {
      combo.forEach((k, i) => {
        if (!k.flag) return;
        if (event[k.flag]) down.add(i);
        else down.delete(i);
      });
    }

    function flash() {
      const el = ring.current;
      if (!el || typeof el.animate !== "function") return;
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.animate(
        still
          ? [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }]
          : [
              { opacity: 0, transform: "scale(0.94)" },
              { opacity: 1, transform: "scale(1)", offset: 0.3 },
              { opacity: 0, transform: "scale(1.05)" },
            ],
        { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      syncFlags(event);
      const id = event.code || event.key;
      combo.forEach((k, i) => {
        if (!k.test?.(event)) return;
        if (down.has(i)) complete = false;
        down.add(i);
        byCode.set(id, [...(byCode.get(id) ?? []), i]);
      });
      publish(true, event);
    }

    function onKeyUp(event: KeyboardEvent) {
      const id = event.code || event.key;
      if (event.key === "Meta") {
        for (const list of byCode.values()) for (const i of list) down.delete(i);
        byCode.clear();
      }
      for (const i of byCode.get(id) ?? []) down.delete(i);
      byCode.delete(id);
      syncFlags(event);
      publish(false);
    }

    function release() {
      down.clear();
      byCode.clear();
      complete = false;
      setHeld(0);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") release();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [listen, combo]);

  const between = separator === undefined ? (apple ? null : "+") : separator;
  const spoken = combo.map((k) => k.name).join(" ");

  return (
    <kbd
      {...props}
      className={cn(
        "relative inline-flex items-center align-middle font-sans font-normal whitespace-nowrap",
        className,
      )}
    >
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true" className={cn("inline-flex items-center", between == null ? "gap-0.5" : "gap-1")}>
        {combo.map((k, i) => (
          <Fragment key={`${k.label}-${i}`}>
            {i > 0 && between != null ? (
              <span className={cn("leading-none", size === "sm" ? "text-[11px]" : "text-xs", separators[variant])}>
                {between}
              </span>
            ) : null}
            <Kbd
              size={size}
              variant={variant}
              isPressed={listen && (held & (1 << i)) !== 0}
              className={symbolGlyph.test(k.label) ? "font-sans" : undefined}
            >
              {k.label}
            </Kbd>
          </Fragment>
        ))}
      </span>
      {listen ? (
        <span
          ref={ring}
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-lg opacity-0 ring-2 ring-brand"
        />
      ) : null}
    </kbd>
  );
}

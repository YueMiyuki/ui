"use client";

import { CircleAlert, CornerDownLeft, SearchX } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type SearchFieldProps as AriaSearchFieldProps,
  Autocomplete,
  Dialog,
  Group,
  Header,
  Input,
  type Key,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  ListStateContext,
  Modal,
  ModalOverlay,
  OverlayTriggerStateContext,
  Popover,
  SearchField,
  Text,
} from "react-aria-components";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { Skeleton } from "@/components/miyuki-ui/skeleton";
import { cn } from "@/lib/utils";

export interface SearchBarItem {
  id: string;
  title: ReactNode;
  textValue?: string;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  href?: string;
  depth?: 0 | 1;
}

export interface SearchBarSection {
  id: string;
  title?: ReactNode;
  items: SearchBarItem[];
}

export type SearchBarResults = SearchBarItem[] | SearchBarSection[];
export type SearchBarFilter = "contains" | ((item: SearchBarItem, query: string) => boolean);
export type SearchBarSize = "sm" | "md" | "lg";

export interface SearchBarStrings {
  searching: string;
  results: (count: number) => string;
  noResults: string;
  empty: (query: string) => string;
  emptyHint: string;
  failed: string;
  staleNotice: (query: string) => string;
  retry: string;
  clear: string;
  navigate: string;
  open: string;
  close: string;
  resultsLabel: string;
  suggestionsLabel: string;
}

const defaultStrings: SearchBarStrings = {
  searching: "Searching…",
  results: (count) => (count === 1 ? "1 result" : `${count} results`),
  noResults: "No results",
  empty: (query) => `No results for “${query}”`,
  emptyHint: "Try another word, or check the spelling.",
  failed: "Search failed.",
  staleNotice: (query) => `Showing results for “${query}”.`,
  retry: "Try again",
  clear: "Clear search",
  navigate: "Navigate",
  open: "Open",
  close: "Close",
  resultsLabel: "Results",
  suggestionsLabel: "Suggestions",
};

interface SearchBaseProps {
  value?: string;
  defaultValue?: string;
  onChange?: (query: string) => void;
  results?: SearchBarResults | null;
  suggestions?: SearchBarResults;
  filter?: SearchBarFilter;
  isLoading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  onSelect?: (item: SearchBarItem) => void;
  placeholder?: string;
  emptyState?: ReactNode | ((query: string) => ReactNode);
  highlight?: boolean;
  pendingDelay?: number;
  pendingMinimum?: number;
  strings?: Partial<SearchBarStrings>;
  "aria-label"?: string;
  className?: string;
}

const keyframes = `
@keyframes miyuki-search-bar-in { from { opacity: 0; transform: translateY(var(--miyuki-search-bar-y, 0)) scale(0.96); } }
@keyframes miyuki-search-bar-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes miyuki-search-bar-fade-in { from { opacity: 0; } }
@keyframes miyuki-search-bar-fade-out { to { opacity: 0; } }
@keyframes miyuki-search-bar-rise { from { opacity: 0; transform: translateY(4px); } }
@keyframes miyuki-search-bar-lift { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
@keyframes miyuki-search-bar-sink { to { opacity: 0; transform: scale(0.985); } }
@keyframes miyuki-search-bar-travel { from { transform: translateX(-100%); } to { transform: translateX(300%); } }
@keyframes miyuki-search-bar-breathe { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
@keyframes miyuki-search-bar-spin { to { transform: rotate(360deg); } }
@keyframes miyuki-search-bar-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
`;

function Styles() {
  return (
    <style href="miyuki-search-bar" precedence="miyuki">
      {keyframes}
    </style>
  );
}

type LensPhase = "lens" | "ring" | "closing";

const MORPH: Transition = { type: "spring", stiffness: 420, damping: 34 };

function Lens({ isPending, size }: { isPending: boolean; size: number }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<LensPhase>(isPending ? "ring" : "lens");
  if (isPending && phase !== "ring") setPhase("ring");
  if (!isPending && phase === "ring") setPhase(reduce ? "lens" : "closing");

  const ring = phase !== "lens";
  const glass =
    phase === "lens"
      ? { cx: 11, cy: 11, r: 7, pathLength: 1 }
      : phase === "ring"
        ? { cx: 12, cy: 12, r: 9, pathLength: 0.3 }
        : { cx: 12, cy: 12, r: 9, pathLength: 1 };

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      <motion.circle
        cx={12}
        cy={12}
        r={9}
        stroke="currentColor"
        strokeWidth={2}
        initial={false}
        animate={{ opacity: phase === "ring" ? 0.18 : 0 }}
        transition={{ duration: 0.2 }}
      />
      <g
        className={cn(
          ring && !reduce && "animate-[miyuki-search-bar-spin_0.8s_linear_infinite]",
          phase === "ring" && reduce && "animate-[miyuki-search-bar-pulse_1.6s_ease-in-out_infinite]",
        )}
        style={{ transformOrigin: "12px 12px" }}
      >
        <motion.circle
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          initial={false}
          animate={glass}
          transition={reduce ? { duration: 0 } : phase === "closing" ? { duration: 0.16, ease: "easeOut" } : MORPH}
          onAnimationComplete={() => {
            if (phase === "closing") setPhase("lens");
          }}
        />
      </g>
      <motion.path
        d="M16 16 20.6 20.6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        initial={false}
        animate={
          phase === "lens"
            ? {
                pathLength: 1,
                opacity: 1,
                transition: reduce
                  ? { duration: 0 }
                  : { pathLength: { ...MORPH, delay: 0.05 }, opacity: { duration: 0.01, delay: 0.05 } },
              }
            : {
                pathLength: 0,
                opacity: 0,
                transition: reduce
                  ? { duration: 0 }
                  : { pathLength: { duration: 0.12, ease: "easeIn" }, opacity: { duration: 0.05, delay: 0.07 } },
              }
        }
      />
    </svg>
  );
}

type LinePhase = "off" | "on" | "fading";

function CurrentLine({ active, className, base }: { active: boolean; className?: string; base: string }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<LinePhase>(active ? "on" : "off");
  if (active && phase !== "on") setPhase("on");
  if (!active && phase === "on") setPhase("fading");

  useEffect(() => {
    if (phase !== "fading") return;
    const id = setTimeout(() => setPhase("off"), 200);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === "off") return null;
  const lit = phase !== "fading";

  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute overflow-hidden", className)}>
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 h-[2px] transition-opacity ease-out rtl:-scale-x-100",
          lit ? "opacity-100 duration-150 starting:opacity-0" : "opacity-0 duration-200",
          base,
        )}
      >
        <span
          className={cn(
            "absolute inset-0 bg-brand/25",
            reduce && "animate-[miyuki-search-bar-breathe_1.6s_ease-in-out_infinite]",
          )}
        />
        {!reduce && (
          <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full rounded-full bg-linear-to-r from-transparent via-brand/70 to-brand animate-[miyuki-search-bar-travel_1.1s_ease-in-out_infinite]" />
        )}
      </span>
    </span>
  );
}

function useWorking(isLoading: boolean, delay: number, minimum: number) {
  const [waited, setWaited] = useState(false);
  const [cue, setCue] = useState(false);
  const live = useRef({ loading: isLoading, cue: false, held: false });
  const holdTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const s = live.current;
    s.loading = isLoading;
    if (!isLoading) {
      setWaited(false);
      if (s.cue && !s.held) {
        s.cue = false;
        setCue(false);
      }
      return;
    }
    const wait = setTimeout(() => {
      setWaited(true);
      if (s.cue) return;
      s.cue = true;
      s.held = true;
      setCue(true);
      holdTimer.current = setTimeout(() => {
        s.held = false;
        if (!s.loading) {
          s.cue = false;
          setCue(false);
        }
      }, minimum);
    }, delay);
    return () => clearTimeout(wait);
  }, [isLoading, delay, minimum]);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  return { pending: waited && isLoading, cue };
}

function fold(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function termsOf(query: string) {
  return fold(query).split(/\s+/).filter(Boolean);
}

function plain(node: ReactNode) {
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

function isSectionList(list: SearchBarResults): list is SearchBarSection[] {
  const first = list[0] as Partial<SearchBarSection> | undefined;
  return first != null && Array.isArray(first.items);
}

function toSections(list: SearchBarResults | null | undefined): SearchBarSection[] {
  if (!list || list.length === 0) return [];
  return isSectionList(list) ? list : [{ id: "results", items: list as SearchBarItem[] }];
}

function filterSections(sections: SearchBarSection[], filter: SearchBarFilter, query: string) {
  const terms = termsOf(query);
  const whole = terms.join(" ");
  const tier = (item: SearchBarItem) => {
    const title = fold(item.textValue ?? plain(item.title))
      .replace(/\s+/g, " ")
      .trim();
    if (title === whole) return 0;
    if (title.startsWith(whole)) return 1;
    for (let at = title.indexOf(whole); at !== -1; at = title.indexOf(whole, at + 1)) {
      if (!/[\p{L}\p{N}]/u.test(title[at - 1])) return 2;
    }
    return title.includes(whole) ? 3 : 4;
  };
  const keep =
    filter === "contains"
      ? (item: SearchBarItem) => {
          const text = fold([item.textValue ?? plain(item.title), plain(item.description)].join(" "));
          return terms.every((term) => text.includes(term));
        }
      : (item: SearchBarItem) => filter(item, query);
  const rank = (items: SearchBarItem[]) =>
    filter === "contains"
      ? items
          .map((item, order) => ({ item, order, tier: tier(item) }))
          .sort((a, b) => a.tier - b.tier || a.order - b.order)
          .map((entry) => entry.item)
      : items;
  return sections
    .map((section) => ({ ...section, items: rank(section.items.filter(keep)) }))
    .filter((section) => section.items.length > 0);
}

function markRanges(text: string, terms: string[]) {
  let folded = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;
  for (const char of text) {
    const f = fold(char);
    for (let k = 0; k < f.length; k++) {
      folded += f[k];
      starts.push(index);
      ends.push(index + char.length);
    }
    index += char.length;
  }
  const found: [number, number][] = [];
  for (const term of terms) {
    let at = folded.indexOf(term);
    while (at !== -1) {
      found.push([starts[at], ends[at + term.length - 1]]);
      at = folded.indexOf(term, at + term.length);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

function Marked({ text, terms }: { text: string; terms: string[] }) {
  const ranges = markRanges(text, terms);
  if (ranges.length === 0) return text;
  const out: ReactNode[] = [];
  let pos = 0;
  for (const [a, b] of ranges) {
    if (a > pos) out.push(text.slice(pos, a));
    out.push(
      <mark key={a} className="bg-transparent font-medium text-brand-strong">
        {text.slice(a, b)}
      </mark>,
    );
    pos = b;
  }
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

function useArrivals(ids: string[], signature: string, stagger: boolean) {
  const [seen, setSeen] = useState(() => ({
    signature,
    delays: new Map<string, number | null>(ids.map((id) => [id, null])),
  }));
  if (seen.signature === signature) return seen.delays;
  const delays = new Map<string, number | null>();
  let n = 0;
  for (const id of ids) {
    if (seen.delays.has(id)) delays.set(id, seen.delays.get(id) ?? null);
    else {
      delays.set(id, stagger ? Math.min(n * 30, 200) : 0);
      n++;
    }
  }
  setSeen({ signature, delays });
  return delays;
}

function useSearchState(props: SearchBaseProps) {
  const {
    value,
    defaultValue = "",
    onChange,
    results,
    suggestions,
    filter,
    isLoading = false,
    error,
    highlight = true,
    pendingDelay = 150,
    pendingMinimum = 400,
    strings,
  } = props;
  const t = { ...defaultStrings, ...strings };
  const [own, setOwn] = useState(defaultValue);
  const query = value ?? own;
  const searching = query.trim() !== "";
  const { pending, cue } = useWorking(isLoading, pendingDelay, pendingMinimum);
  const reduce = useReducedMotion();

  const [shown, setShown] = useState({ results, query, version: 0 });
  let shownQuery = shown.query;
  let version = shown.version;
  if (shown.results !== results) {
    version = shown.version + 1;
    setShown({ results, query, version });
    shownQuery = query;
  }

  const sections = useMemo(() => {
    if (!searching) return toSections(suggestions);
    const all = toSections(results);
    return filter ? filterSections(all, filter, query) : all;
  }, [searching, suggestions, results, filter, query]);

  const rows = sections.flatMap((section) => section.items);
  const ids = rows.map((row) => row.id);
  const searched = results != null;
  const failed = searching && error != null && error !== false;

  const body: "rows" | "placeholders" | "empty" | "blank" | "none" =
    rows.length > 0 ? "rows" : !searching || failed ? "none" : pending ? "placeholders" : searched ? "empty" : "blank";

  const signature = `${searching ? "r" : "s"}:${ids.join("\n")}`;
  const activation = `${signature}\u0000${version}\u0000${filter ? query : ""}`;
  const terms = highlight && searching ? termsOf(filter ? query : shownQuery) : [];

  const count = rows.length;
  let status = "";
  let announce = "";
  if (searching) {
    if (cue) {
      status = t.searching;
      announce = t.searching;
    } else if (failed) {
      announce = t.failed;
    } else if (searched) {
      status = count === 0 ? "" : t.results(count);
      announce = count === 0 ? t.noResults : t.results(count);
    }
  }

  return {
    query,
    setQuery: (next: string) => {
      if (value === undefined) setOwn(next);
      onChange?.(next);
    },
    searching,
    sections,
    rows,
    body,
    pending,
    cue,
    dim: pending && searching && rows.length > 0,
    failed,
    shownQuery,
    signature,
    activation,
    ids,
    terms,
    reduce: Boolean(reduce),
    status,
    announce,
    t,
  };
}

type SearchState = ReturnType<typeof useSearchState>;

interface RowContextValue {
  delays: Map<string, number | null>;
  terms: string[];
  activation: string;
  reduce: boolean;
  pointer: RefObject<{ x: number; y: number } | null>;
}

const RowContext = createContext<RowContextValue | null>(null);

function RowBody({ item, active, first }: { item: SearchBarItem; active: boolean; first: boolean }) {
  const ctx = useContext(RowContext);
  const list = useContext(ListStateContext);
  const manager = useRef(list?.selectionManager);
  const activation = ctx?.activation;

  useLayoutEffect(() => {
    manager.current = list?.selectionManager;
  });

  useLayoutEffect(() => {
    const m = manager.current;
    if (!first || !m || activation == null) return;
    m.setFocused(true);
    m.setFocusedKey(item.id);
  }, [first, activation, item.id]);

  const terms = ctx?.terms ?? [];
  const title = typeof item.title === "string" ? <Marked text={item.title} terms={terms} /> : item.title;
  const description =
    typeof item.description === "string" ? <Marked text={item.description} terms={terms} /> : item.description;

  return (
    <div
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || !ctx) return;
        const last = ctx.pointer.current;
        const moved = !last || last.x !== event.clientX || last.y !== event.clientY;
        ctx.pointer.current = { x: event.clientX, y: event.clientY };
        const m = manager.current;
        if (!moved || active || !m) return;
        m.setFocused(true);
        m.setFocusedKey(item.id);
      }}
      className={cn("flex items-start gap-3 py-2 pe-2.5", item.depth === 1 ? "ps-8" : "ps-2.5")}
    >
      {item.depth === 1 && <span aria-hidden="true" className="absolute inset-y-0 start-[17.5px] w-px bg-border" />}
      {item.icon != null && (
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 w-4 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 [&_svg]:size-4",
            active && "text-foreground",
          )}
        >
          {item.icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-3">
          <Text slot="label" className="line-clamp-2 min-w-0 flex-1 text-sm leading-5 text-foreground">
            {title}
          </Text>
          {item.meta != null && (
            <span className="max-w-1/2 shrink-0 truncate text-xs leading-5 text-muted-foreground">{item.meta}</span>
          )}
        </span>
        {item.description != null && (
          <Text slot="description" className="line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">
            {description}
          </Text>
        )}
      </span>
      <CornerDownLeft
        aria-hidden="true"
        className={cn(
          "mt-[3px] size-3.5 shrink-0 text-muted-foreground transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

function ResultRow({ item, first }: { item: SearchBarItem; first: boolean }) {
  const ctx = useContext(RowContext);
  const delay = ctx?.delays.get(item.id);
  const textValue = item.textValue ?? (plain(item.title) || undefined);
  return (
    <ListBoxItem
      id={item.id}
      textValue={textValue}
      href={item.href}
      className={cn(
        "relative block cursor-default rounded-md text-foreground no-underline outline-none select-none data-[focused]:bg-accent",
        delay != null &&
          (ctx?.reduce
            ? "animate-[miyuki-search-bar-fade-in_120ms_ease-out_both]"
            : "animate-[miyuki-search-bar-rise_200ms_cubic-bezier(0.22,1,0.36,1)_both]"),
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {({ isFocused }) => <RowBody item={item} active={isFocused} first={first} />}
    </ListBoxItem>
  );
}

function Placeholders({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("animate-[miyuki-search-bar-fade-in_150ms_ease-out_both]", className)}>
      {[
        ["40%", "70%"],
        ["34%", "62%"],
        ["46%", "76%"],
      ].map(([title, line]) => (
        <div key={title} className="flex items-start gap-3 px-2.5 py-2">
          <span className="flex h-5 shrink-0 items-center">
            <Skeleton className="size-4 rounded-sm dark:bg-accent" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex h-5 items-center">
              <Skeleton className="h-3 rounded-sm dark:bg-accent" style={{ width: title }} />
            </span>
            <span className="flex h-[18px] items-center">
              <Skeleton className="h-2.5 rounded-sm dark:bg-accent" style={{ width: line }} />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DefaultEmpty({ query, t }: { query: string; t: SearchBarStrings }) {
  return (
    <>
      <SearchX aria-hidden="true" className="mb-1.5 size-5 text-muted-foreground" strokeWidth={1.75} />
      <p className="max-w-full text-sm font-medium text-foreground [overflow-wrap:anywhere]">{t.empty(query.trim())}</p>
      <p className="text-[13px] text-muted-foreground">{t.emptyHint}</p>
    </>
  );
}

function ErrorLine({
  error,
  stale,
  onRetry,
  className,
  t,
}: {
  error: ReactNode;
  stale: string | null;
  onRetry?: () => void;
  className?: string;
  t: SearchBarStrings;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md bg-destructive-soft px-2.5 py-2 text-[13px] leading-5 text-destructive-strong",
        className,
      )}
    >
      <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
      <p className="min-w-0 flex-1">
        {error === true ? t.failed : error}
        {stale != null && <> {t.staleNotice(stale)}</>}
      </p>
      {onRetry != null && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onRetry}
          className="shrink-0 cursor-default rounded-sm font-medium underline decoration-destructive-strong/40 underline-offset-2 outline-none transition-[text-decoration-color] duration-150 hover:decoration-destructive-strong focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {t.retry}
        </button>
      )}
    </div>
  );
}

function useAutoHeight(hold: boolean) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const holding = useRef(hold);
  const measure = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    let current = -1;
    measure.current = () => {
      const height = content.offsetHeight;
      if (height === current || (holding.current && height < current)) return;
      if (current < 0) {
        box.style.transition = "none";
        box.style.height = `${height}px`;
        void box.offsetHeight;
        box.style.transition = "";
      } else {
        box.style.height = `${height}px`;
      }
      current = height;
    };
    measure.current();
    const observer = new ResizeObserver(() => measure.current());
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    holding.current = hold;
    if (!hold) measure.current();
  }, [hold]);

  return { outer, inner };
}

interface ResultsProps {
  state: SearchState;
  variant: "bar" | "dialog";
  emptyState?: ReactNode | ((query: string) => ReactNode);
  onRetry?: () => void;
  onAction: (key: Key) => void;
  error?: ReactNode;
  nudge?: number;
}

function Results({ state, variant, emptyState, onRetry, onAction, error, nudge = 0 }: ResultsProps) {
  const { outer, inner } = useAutoHeight(state.body === "blank");
  const delays = useArrivals(state.ids, state.signature, !state.reduce);
  const listRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const signature = state.signature;

  useLayoutEffect(() => {
    if (signature && listRef.current) listRef.current.scrollTop = 0;
  }, [signature]);

  const rowContext = useMemo(
    () => ({
      delays,
      terms: state.terms,
      activation: `${state.activation}\u0000${nudge}`,
      reduce: state.reduce,
      pointer,
    }),
    [delays, state.terms, state.activation, state.reduce, nudge],
  );

  const pad = variant === "bar" ? "p-1.5" : "p-2";
  const flat = state.sections.length === 1 && state.sections[0].title == null;
  const firstId = state.rows[0]?.id;

  return (
    <div
      ref={outer}
      className="shrink-0 overflow-hidden transition-[height] duration-220 ease-settle motion-reduce:transition-none"
    >
      <div ref={inner}>
        {state.failed && (
          <ErrorLine
            error={error}
            stale={state.rows.length > 0 ? state.shownQuery.trim() : null}
            onRetry={onRetry}
            t={state.t}
            className={cn(
              variant === "bar" ? "mx-1.5 mt-1.5" : "mx-2 mt-2",
              state.body !== "rows" && (variant === "bar" ? "mb-1.5" : "mb-2"),
            )}
          />
        )}
        <RowContext.Provider value={rowContext}>
          <ListBox
            ref={listRef}
            aria-label={state.searching ? state.t.resultsLabel : state.t.suggestionsLabel}
            aria-busy={state.pending || undefined}
            onAction={onAction}
            shouldFocusWrap
            className={cn(
              "overflow-y-auto overscroll-contain outline-none transition-opacity duration-150 ease-out",
              variant === "bar"
                ? "max-h-[min(360px,50dvh)] scroll-py-1.5"
                : "max-h-[min(440px,calc(100dvh-220px))] scroll-py-2",
              state.body === "rows" ? pad : "p-0",
              state.dim && "opacity-55",
            )}
          >
            {flat
              ? state.sections[0].items.map((item) => (
                  <ResultRow key={item.id} item={item} first={item.id === firstId} />
                ))
              : state.sections.map((section) => (
                  <ListBoxSection key={section.id} id={section.id} className="block not-first:mt-1">
                    {section.title != null && (
                      <Header className="px-2.5 pt-2.5 pb-1 text-xs leading-4 font-medium text-muted-foreground">
                        {section.title}
                      </Header>
                    )}
                    {section.items.map((item) => (
                      <ResultRow key={item.id} item={item} first={item.id === firstId} />
                    ))}
                  </ListBoxSection>
                ))}
          </ListBox>
        </RowContext.Provider>
        {state.body === "placeholders" && <Placeholders className={pad} />}
        {state.body === "empty" && (
          <div className="flex animate-[miyuki-search-bar-fade-in_150ms_ease-out_both] flex-col items-center gap-1 px-6 pt-8 pb-9 text-center">
            {typeof emptyState === "function"
              ? emptyState(state.shownQuery)
              : (emptyState ?? <DefaultEmpty query={state.shownQuery} t={state.t} />)}
          </div>
        )}
        {variant === "bar" && state.status !== "" && (
          <div className="flex h-8 items-center border-t border-border px-3 text-xs text-muted-foreground tabular-nums">
            {state.status}
          </div>
        )}
      </div>
    </div>
  );
}

const heights: Record<SearchBarSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<SearchBarSize, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const padEnd: Record<SearchBarSize, string> = { sm: "pe-1.5", md: "pe-2", lg: "pe-3" };
const endGap: Record<SearchBarSize, string> = { sm: "me-1.5", md: "me-2", lg: "me-3" };

function fieldBox({ isHovered, isFocused }: { isHovered: boolean; isFocused: boolean }) {
  return cn(
    "rounded-lg border bg-card text-sm text-foreground shadow-xs outline-none",
    "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
    isFocused ? "border-brand ring-[3px] ring-ring" : isHovered ? "border-border-strong" : "border-input",
  );
}

interface Shortcut {
  key: string;
  mod: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

function parseShortcut(text: string): Shortcut | null {
  const tokens = text
    .replace(/[⌘⌃⌥⇧]/g, (m) => ` ${m} `)
    .split(/[\s+]+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
  const key = tokens.pop();
  if (!key) return null;
  const has = (...names: string[]) => tokens.some((t) => names.includes(t));
  return {
    key,
    mod: has("⌘", "cmd", "command", "meta", "mod"),
    ctrl: has("⌃", "ctrl", "control"),
    alt: has("⌥", "alt", "option"),
    shift: has("⇧", "shift"),
  };
}

function isEditable(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
}

// the panel never takes focus, so its overlay must not hand focus back to the field when it closes
const overlayFocus = { disableFocusManagement: true };

type FieldKeyEvent = Parameters<NonNullable<AriaSearchFieldProps["onKeyDown"]>>[0];

export interface SearchBarProps extends SearchBaseProps {
  size?: SearchBarSize;
  shortcut?: string;
  label?: ReactNode;
  description?: ReactNode;
  panelClassName?: string;
  isDisabled?: boolean;
  autoFocus?: boolean;
  name?: string;
  id?: string;
  ref?: Ref<HTMLDivElement>;
}

export function SearchBar({
  size = "md",
  shortcut,
  label,
  description,
  panelClassName,
  isDisabled,
  autoFocus,
  name,
  id,
  placeholder = "Search…",
  emptyState,
  onRetry,
  onSelect,
  error,
  className,
  ref,
  "aria-label": ariaLabel,
  ...props
}: SearchBarProps) {
  const state = useSearchState({ ...props, error });
  const groupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(0);

  const showable = state.body === "rows" || state.body === "placeholders" || state.body === "empty" || state.failed;
  const next = focused && !dismissed && (showable || (open && state.body === "blank"));
  if (next !== open) setOpen(next);

  useEffect(() => {
    const combo = shortcut ? parseShortcut(shortcut) : null;
    if (!combo || isDisabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!combo || e.defaultPrevented || e.repeat) return;
      if (e.key.toLowerCase() !== combo.key) return;
      const bare = !combo.mod && !combo.ctrl && !combo.alt;
      if (combo.mod ? !(e.metaKey || e.ctrlKey) : combo.ctrl ? !e.ctrlKey : e.metaKey || e.ctrlKey) return;
      if (combo.alt !== e.altKey) return;
      if (combo.shift && !e.shiftKey) return;
      if (bare && isEditable(document.activeElement)) return;
      const input = inputRef.current;
      if (!input || document.activeElement === input) return;
      e.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, isDisabled]);

  function focusInput(event: MouseEvent) {
    if (event.target === inputRef.current || (event.target as Element).closest("button")) return;
    event.preventDefault();
    inputRef.current?.focus();
  }

  function onKeyDown(event: FieldKeyEvent) {
    if (event.key === "Escape" && state.query === "" && open) setDismissed(true);
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) setDismissed(false);
    if (event.key === "Enter" && state.failed && state.rows.length === 0) onRetry?.();
  }

  function choose(key: Key) {
    const item = state.rows.find((row) => row.id === key);
    if (!item) return;
    onSelect?.(item);
    setDismissed(true);
  }

  return (
    <Autocomplete
      inputValue={state.query}
      onInputChange={(value) => {
        state.setQuery(value);
        if (value !== "") setDismissed(false);
      }}
    >
      <Styles />
      <SearchField
        ref={ref}
        id={id}
        name={name}
        autoFocus={autoFocus}
        isDisabled={isDisabled}
        aria-label={label == null ? (ariaLabel ?? "Search") : undefined}
        onKeyDown={onKeyDown}
        className={cn("group/field flex flex-col gap-1.5 data-[disabled]:opacity-50", className)}
      >
        {({ isEmpty }) => (
          <>
            {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
            <Group
              ref={groupRef}
              onMouseDown={focusInput}
              className={(group) =>
                cn(
                  fieldBox({ isHovered: group.isHovered, isFocused: focused }),
                  "relative flex w-full cursor-text items-center data-[disabled]:cursor-not-allowed",
                  heights[size],
                )
              }
            >
              <span
                className={cn(
                  "flex shrink-0 transition-colors duration-150",
                  padStart[size],
                  state.cue ? "text-brand" : "text-muted-foreground",
                )}
              >
                <Lens isPending={state.cue} size={16} />
              </span>
              <Input
                ref={inputRef}
                placeholder={placeholder}
                aria-busy={state.cue || undefined}
                onFocus={(event) => {
                  if (!event.nativeEvent.isTrusted) return;
                  setFocused(true);
                  setDismissed(false);
                }}
                onBlur={(event) => {
                  if (event.nativeEvent.isTrusted) setFocused(false);
                }}
                onClick={() => {
                  setDismissed(false);
                  setNudge((n) => n + 1);
                }}
                className={cn(
                  "h-full w-full min-w-0 flex-1 bg-transparent ps-2 text-sm text-foreground outline-none",
                  "placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed",
                  "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
                  isEmpty && !shortcut ? padEnd[size] : "pe-1",
                )}
              />
              {!isEmpty ? (
                <CloseButton
                  size="sm"
                  aria-label={state.t.clear}
                  className={cn(
                    "transition-[scale,opacity,background-color,color] duration-200 ease-settle starting:scale-50 starting:opacity-0",
                    endGap[size],
                  )}
                />
              ) : shortcut ? (
                <kbd
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm border border-border bg-muted px-1.5 font-mono text-xs leading-none text-muted-foreground",
                    endGap[size],
                  )}
                >
                  {shortcut}
                </kbd>
              ) : null}
              <CurrentLine active={state.cue} base="bg-card" className="-inset-px rounded-lg" />
            </Group>
            {description != null && (
              <Text slot="description" className="text-[13px] leading-5 text-muted-foreground">
                {description}
              </Text>
            )}
            <span role="status" className="sr-only">
              {state.announce}
            </span>
          </>
        )}
      </SearchField>
      <Popover
        {...overlayFocus}
        triggerRef={groupRef}
        isOpen={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDismissed(true);
        }}
        isNonModal
        placement="bottom start"
        offset={6}
        className={cn(
          "flex w-(--trigger-width) min-w-(--trigger-width) flex-col overflow-clip rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
          "[--miyuki-search-bar-ox:min(calc(var(--trigger-width)/2),100%)] [&[dir=rtl]]:[--miyuki-search-bar-ox:calc(100%_-_min(calc(var(--trigger-width)/2),100%))]",
          "origin-[var(--miyuki-search-bar-ox)_var(--miyuki-search-bar-oy,0px)] data-[placement=top]:[--miyuki-search-bar-oy:100%]",
          "data-[placement=bottom]:[--miyuki-search-bar-y:-4px] data-[placement=top]:[--miyuki-search-bar-y:4px]",
          "data-[entering]:animate-[miyuki-search-bar-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
          "data-[exiting]:animate-[miyuki-search-bar-out_120ms_ease-in_forwards]",
          "motion-reduce:data-[entering]:animate-[miyuki-search-bar-fade-in_120ms_ease-out]",
          "motion-reduce:data-[exiting]:animate-[miyuki-search-bar-fade-out_100ms_ease-in_forwards]",
          panelClassName,
        )}
      >
        <div onMouseDown={(event) => event.preventDefault()} className="flex min-h-0 flex-col">
          <Results
            state={state}
            variant="bar"
            nudge={nudge}
            emptyState={emptyState}
            onRetry={onRetry}
            onAction={choose}
            error={error}
          />
        </div>
      </Popover>
    </Autocomplete>
  );
}

const kbd =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-muted px-1 font-mono text-xs leading-none text-muted-foreground";

function Hint({ keys, children, className }: { keys: string[]; children: ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className="flex gap-0.5" aria-hidden="true">
        {keys.map((key) => (
          <kbd key={key} className={kbd}>
            {key}
          </kbd>
        ))}
      </span>
      {children}
    </span>
  );
}

interface DialogBodyProps extends SearchBaseProps {
  footer?: ReactNode;
  onClose: () => void;
}

function DialogBody({
  placeholder = "Search…",
  emptyState,
  onRetry,
  onSelect,
  error,
  footer,
  onClose,
  "aria-label": ariaLabel,
  ...props
}: DialogBodyProps) {
  const state = useSearchState({ ...props, error });
  const empty = state.body === "none" && !state.failed;

  function onKeyDown(event: FieldKeyEvent) {
    if (event.key === "Enter" && state.failed && state.rows.length === 0) onRetry?.();
  }

  function choose(key: Key) {
    const item = state.rows.find((row) => row.id === key);
    if (!item) return;
    onSelect?.(item);
    onClose();
  }

  return (
    <Autocomplete inputValue={state.query} onInputChange={state.setQuery}>
      <SearchField
        aria-label={ariaLabel ?? "Search"}
        autoFocus
        onKeyDown={onKeyDown}
        className="flex h-13 shrink-0 items-center gap-3 ps-4 pe-3"
      >
        {({ isEmpty }) => (
          <>
            <span
              className={cn(
                "flex shrink-0 transition-colors duration-150",
                state.cue ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Lens isPending={state.cue} size={18} />
            </span>
            <Input
              placeholder={placeholder}
              aria-busy={state.cue || undefined}
              className={cn(
                "h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground",
                "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
              )}
            />
            {!isEmpty && (
              <CloseButton
                size="md"
                aria-label={state.t.clear}
                className="transition-[scale,opacity,background-color,color] duration-200 ease-settle starting:scale-50 starting:opacity-0"
              />
            )}
          </>
        )}
      </SearchField>
      <div className="relative h-px shrink-0 bg-border">
        <CurrentLine active={state.cue} base="bg-popover" className="inset-x-0 top-0 h-[2px]" />
      </div>
      <Results
        state={state}
        variant="dialog"
        emptyState={emptyState}
        onRetry={onRetry}
        onAction={choose}
        error={error}
      />
      <div
        className={cn(
          "flex h-10 shrink-0 items-center gap-4 px-4 text-xs text-muted-foreground",
          !empty && "border-t border-border",
        )}
      >
        {footer}
        <span className="min-w-0 truncate tabular-nums">{state.status}</span>
        <span className="ms-auto flex shrink-0 items-center gap-4">
          <Hint keys={["↑", "↓"]} className="max-sm:hidden">
            {state.t.navigate}
          </Hint>
          <Hint keys={["↵"]}>{state.t.open}</Hint>
          <Hint keys={["esc"]}>{state.t.close}</Hint>
        </span>
      </div>
      <span role="status" className="sr-only">
        {state.announce}
      </span>
    </Autocomplete>
  );
}

export interface SearchDialogProps extends SearchBaseProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  shortcut?: string | null;
  backdropBlur?: boolean;
  footer?: ReactNode;
  overlayClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function SearchDialog({
  isOpen: isOpenProp,
  defaultOpen = false,
  onOpenChange,
  shortcut = "k",
  backdropBlur = false,
  className,
  overlayClassName,
  ref,
  ...props
}: SearchDialogProps) {
  const trigger = useContext(OverlayTriggerStateContext);
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = isOpenProp ?? trigger?.isOpen ?? own;

  const setOpen = (next: boolean) => {
    if (isOpenProp === undefined) {
      if (trigger) trigger.setOpen(next);
      else setOwn(next);
    }
    onOpenChange?.(next);
  };

  const latest = useRef({ isOpen, setOpen });
  useEffect(() => {
    latest.current = { isOpen, setOpen };
  });

  useEffect(() => {
    if (!shortcut) return;
    const key = shortcut.toLowerCase();
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.shiftKey) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== key) return;
      event.preventDefault();
      latest.current.setOpen(!latest.current.isOpen);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  return (
    <>
      <Styles />
      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={setOpen}
        isDismissable
        className={cn(
          "fixed top-0 left-0 z-50 flex h-(--visual-viewport-height) w-full items-start justify-center px-4 pt-[max(16px,13vh)] pb-4",
          "bg-foreground/25 dark:bg-background/60",
          backdropBlur && "backdrop-blur-sm",
          "data-[entering]:animate-[miyuki-search-bar-fade-in_200ms_ease-out]",
          "data-[exiting]:animate-[miyuki-search-bar-fade-out_120ms_ease-in_forwards]",
          overlayClassName,
        )}
      >
        <Modal
          ref={ref}
          className={cn(
            "flex max-h-full w-full max-w-[600px] flex-col overflow-clip rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl outline-none",
            "data-[entering]:animate-[miyuki-search-bar-lift_240ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-search-bar-sink_120ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-search-bar-fade-in_120ms_ease-out]",
            "motion-reduce:data-[exiting]:animate-[miyuki-search-bar-fade-out_100ms_ease-in_forwards]",
            className,
          )}
        >
          <Dialog
            aria-label={props["aria-label"] ?? "Search"}
            render={(domProps) => <section {...domProps} role={domProps.role ?? "dialog"} aria-modal="true" />}
            className="flex min-h-0 flex-col outline-none"
          >
            {({ close }) => <DialogBody {...props} onClose={close} />}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

"use client";

import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  ChevronDown,
  ChevronsLeftRight,
  ChevronsRightLeft,
  CircleDashed,
  Hash,
  List,
  ListFilter,
  Type,
  X,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button as AriaButton, ListBox, useLocale } from "react-aria-components";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Button } from "@/components/miyuki-ui/button";
import { TextField } from "@/components/miyuki-ui/input";
import { Popover, PopoverTrigger } from "@/components/miyuki-ui/popover";
import { SelectItem } from "@/components/miyuki-ui/select";
import { cn } from "@/lib/utils";

export type DataGridColumnType = "text" | "number" | "select" | "status";

export interface DataGridOption {
  value: string;
  label?: string;
  tone?: BadgeTone;
}

export interface DataGridColumn {
  id: string;
  name: string;
  type?: DataGridColumnType;
  width?: number;
  options?: (string | DataGridOption)[];
  format?: (value: number) => string;
}

export type DataGridRow = Record<string, unknown>;

export interface DataGridProps<T extends DataGridRow = DataGridRow>
  extends Omit<ComponentProps<"div">, "onChange" | "children"> {
  columns: DataGridColumn[];
  rows: T[];
  onChange?: (rows: T[]) => void;
}

const ROW = 32;
const HEAD = 36;
const GUTTER = 48;
const MIN_WIDTH = 64;
const MAX_WIDTH = 560;
const OVERSCAN = 8;

const defaultWidth: Record<DataGridColumnType, number> = { text: 200, number: 112, select: 148, status: 132 };

const typeIcon: Record<DataGridColumnType, ReactNode> = {
  text: <Type />,
  number: <Hash />,
  select: <List />,
  status: <CircleDashed />,
};

const chrome = "bg-[color-mix(in_oklab,var(--muted)_60%,var(--card))]";

const keyframes = `
@keyframes miyuki-data-grid-flash { from { background-color: color-mix(in oklab, var(--brand) 30%, transparent); } to { background-color: transparent; } }
@keyframes miyuki-data-grid-in { from { opacity: 0; transform: translateY(var(--miyuki-data-grid-from, -4px)); } }
`;

interface Option {
  value: string;
  label: string;
  tone?: BadgeTone;
}

interface Col extends DataGridColumn {
  type: DataGridColumnType;
  opts: Option[];
}

interface Pos {
  r: number;
  c: number;
}

interface Range {
  r0: number;
  r1: number;
  c0: number;
  c1: number;
}

type Sort = { id: string; dir: 1 | -1 };

type Filter =
  | { kind: "text"; query: string }
  | { kind: "set"; values: string[] }
  | { kind: "range"; min: string; max: string };

const INVALID = Symbol("invalid");

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(text: string) {
  const t = text.trim();
  if (t === "" || !/\d/.test(t)) return null;
  const n = Number(t.replace(/[^\d.eE+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function rawText(col: Col, value: unknown) {
  if (value == null) return "";
  if (col.type === "select" || col.type === "status") {
    return col.opts.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

function parse(col: Col, text: string): unknown {
  if (col.type === "text") return text.trim();
  const t = text.trim();
  if (t === "") return null;
  if (col.type === "number") return toNumber(t) ?? INVALID;
  const key = fold(t);
  return col.opts.find((o) => fold(o.value) === key || fold(o.label) === key)?.value ?? INVALID;
}

function isActive(filter: Filter | undefined) {
  if (!filter) return false;
  if (filter.kind === "text") return filter.query.trim() !== "";
  if (filter.kind === "set") return filter.values.length > 0;
  return toNumber(filter.min) != null || toNumber(filter.max) != null;
}

function passes(col: Col, value: unknown, filter: Filter) {
  if (filter.kind === "text") return fold(rawText(col, value)).includes(fold(filter.query.trim()));
  if (filter.kind === "set") return filter.values.includes(String(value ?? ""));
  if (typeof value !== "number") return false;
  const min = toNumber(filter.min);
  const max = toNumber(filter.max);
  return (min == null || value >= min) && (max == null || value <= max);
}

function computeView<T extends DataGridRow>(
  data: T[],
  cols: Col[],
  sort: Sort | null,
  filters: Record<string, Filter>,
) {
  const active = cols.filter((c) => isActive(filters[c.id]));
  const out: number[] = [];
  data.forEach((row, i) => {
    if (active.every((c) => passes(c, row[c.id], filters[c.id]))) out.push(i);
  });
  const col = sort && cols.find((c) => c.id === sort.id);
  if (!sort || !col) return out;
  const rank = (value: unknown) => {
    if (col.type === "select" || col.type === "status") return col.opts.findIndex((o) => o.value === value);
    return value;
  };
  return out.sort((a, b) => {
    const x = rank(data[a][col.id]);
    const y = rank(data[b][col.id]);
    const missing = (v: unknown) => v == null || v === "" || v === -1;
    if (missing(x) || missing(y)) return missing(x) ? (missing(y) ? a - b : 1) : -1;
    const order =
      typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
    return order * sort.dir || a - b;
  });
}

function parseTsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function quote(text: string) {
  return /[\t\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function CellValue({ col, value, fmt }: { col: Col; value: unknown; fmt: Intl.NumberFormat }) {
  if (value == null || value === "") return null;
  if (col.type === "number" && typeof value === "number") {
    return <span className="ms-auto truncate tabular-nums">{col.format ? col.format(value) : fmt.format(value)}</span>;
  }
  if (col.type === "status") {
    const option = col.opts.find((o) => o.value === value);
    return (
      <Badge tone={option?.tone ?? "neutral"} size="sm" dot className="max-w-full min-w-0">
        <span className="truncate">{option?.label ?? String(value)}</span>
      </Badge>
    );
  }
  return <span className="truncate">{rawText(col, value)}</span>;
}

interface GridRowProps {
  r: number;
  row: DataGridRow;
  cols: Col[];
  template: string;
  marked: boolean;
  span: [number, number] | null;
  prefix: string;
  fmt: Intl.NumberFormat;
}

const GridRow = memo(function GridRow({ r, row, cols, template, marked, span, prefix, fmt }: GridRowProps) {
  return (
    <div role="row" aria-rowindex={r + 2} className="grid" style={{ gridTemplateColumns: template, height: ROW }}>
      <div
        role="rowheader"
        data-gutter=""
        className={cn(
          "sticky left-0 z-10 flex items-center justify-center border-e border-b border-border text-xs tabular-nums select-none",
          "transition-colors duration-100",
          marked ? "bg-brand-soft font-medium text-brand-strong" : cn(chrome, "text-muted-foreground"),
        )}
      >
        {r + 1}
      </div>
      {cols.map((col, c) => (
        <div
          key={col.id}
          id={`${prefix}-${r}-${c}`}
          role="gridcell"
          aria-colindex={c + 2}
          aria-selected={span != null && c >= span[0] && c <= span[1]}
          data-cell=""
          className="flex min-w-0 items-center border-e border-b border-border px-2 text-[13px] text-foreground select-none"
        >
          <CellValue col={col} value={row[col.id]} fmt={fmt} />
        </div>
      ))}
      <div aria-hidden="true" className="border-b border-border" />
    </div>
  );
});

const toneDot: Record<BadgeTone, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const menuItem = cn(
  "flex h-8 w-full cursor-default items-center gap-2 rounded-md px-2.5 text-start text-sm text-foreground outline-none select-none",
  "transition-colors duration-100 data-[hovered]:bg-accent data-[focus-visible]:bg-accent",
  "[&_svg]:size-4 [&_svg]:shrink-0",
);

interface ColumnMenuProps {
  col: Col;
  sort: Sort | null;
  filter: Filter | undefined;
  counts: Map<string, number>;
  onSort: (dir: 1 | -1 | null) => void;
  onFilter: (filter: Filter | null) => void;
  onResize: (delta: number) => void;
  close: () => void;
}

function ColumnMenu({ col, sort, filter, counts, onSort, onFilter, onResize, close }: ColumnMenuProps) {
  const dir = sort?.id === col.id ? sort.dir : null;
  const [up, down] =
    col.type === "number"
      ? ["Sort low to high", "Sort high to low"]
      : col.type === "text"
        ? ["Sort A to Z", "Sort Z to A"]
        : ["Sort in list order", "Sort in reverse order"];
  const set = filter?.kind === "set" ? filter.values : [];

  return (
    <div className="flex flex-col">
      {(
        [
          [1, up, <ArrowUpNarrowWide key="up" />],
          [-1, down, <ArrowDownWideNarrow key="down" />],
        ] as const
      ).map(([value, label, icon]) => (
        <AriaButton
          key={value}
          className={menuItem}
          onPress={() => {
            onSort(dir === value ? null : value);
            close();
          }}
        >
          <span className="text-muted-foreground">{icon}</span>
          <span className="flex-1">{label}</span>
          {dir === value && <Check strokeWidth={2.25} className="text-brand-strong" />}
        </AriaButton>
      ))}
      <div role="separator" className="-mx-1 my-1 h-px bg-border" />
      <p className="px-2.5 pt-1 pb-1.5 text-xs leading-4 font-medium text-muted-foreground">Width</p>
      <div className="grid grid-cols-2 gap-1 pb-1">
        <AriaButton className={menuItem} onPress={() => onResize(-24)}>
          <span className="text-muted-foreground">
            <ChevronsRightLeft />
          </span>
          <span className="flex-1">Narrower</span>
        </AriaButton>
        <AriaButton className={menuItem} onPress={() => onResize(24)}>
          <span className="text-muted-foreground">
            <ChevronsLeftRight />
          </span>
          <span className="flex-1">Wider</span>
        </AriaButton>
      </div>
      <div role="separator" className="-mx-1 my-1 h-px bg-border" />
      <p className="px-2.5 pt-1 pb-1.5 text-xs leading-4 font-medium text-muted-foreground">Filter</p>
      {col.type === "text" && (
        <div className="px-1 pb-1">
          <TextField
            size="sm"
            autoFocus
            aria-label={`Filter ${col.name}`}
            placeholder="Contains"
            value={filter?.kind === "text" ? filter.query : ""}
            onChange={(query) => onFilter({ kind: "text", query })}
          />
        </div>
      )}
      {col.type === "number" && (
        <div className="grid grid-cols-2 gap-1.5 px-1 pb-1">
          <TextField
            size="sm"
            autoFocus
            inputMode="decimal"
            aria-label={`${col.name} at least`}
            placeholder="Min"
            value={filter?.kind === "range" ? filter.min : ""}
            onChange={(min) => onFilter({ kind: "range", min, max: filter?.kind === "range" ? filter.max : "" })}
          />
          <TextField
            size="sm"
            inputMode="decimal"
            aria-label={`${col.name} at most`}
            placeholder="Max"
            value={filter?.kind === "range" ? filter.max : ""}
            onChange={(max) => onFilter({ kind: "range", min: filter?.kind === "range" ? filter.min : "", max })}
          />
        </div>
      )}
      {(col.type === "select" || col.type === "status") && (
        <ListBox
          aria-label={`Show only these ${col.name.toLowerCase()} values`}
          selectionMode="multiple"
          escapeKeyBehavior="none"
          selectedKeys={set}
          onSelectionChange={(keys) =>
            onFilter({
              kind: "set",
              values:
                keys === "all" ? col.opts.map((o) => o.value) : col.opts.map((o) => o.value).filter((v) => keys.has(v)),
            })
          }
          className="flex max-h-60 flex-col overflow-y-auto outline-none"
        >
          {col.opts.map((option) => (
            <SelectItem
              key={option.value}
              id={option.value}
              textValue={option.label}
              icon={
                col.type === "status" ? (
                  <span className="flex size-4 items-center justify-center">
                    <span className={cn("size-2 rounded-full", toneDot[option.tone ?? "neutral"])} />
                  </span>
                ) : undefined
              }
            >
              <span className="flex items-baseline justify-between gap-3">
                {option.label}
                <span className="text-xs text-muted-foreground tabular-nums">{counts.get(option.value) ?? 0}</span>
              </span>
            </SelectItem>
          ))}
        </ListBox>
      )}
      {isActive(filter) && (
        <>
          <div role="separator" className="-mx-1 my-1 h-px bg-border" />
          <AriaButton className={menuItem} onPress={() => onFilter(null)}>
            <X className="text-muted-foreground" />
            Clear filter
          </AriaButton>
        </>
      )}
    </div>
  );
}

export function DataGrid<T extends DataGridRow>({
  columns,
  rows,
  onChange,
  className,
  "aria-label": ariaLabel = "Data grid",
  ...props
}: DataGridProps<T>) {
  const prefix = useId();
  const reduce = useReducedMotion();
  const { locale, direction } = useLocale();
  const fmt = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);

  const cols = useMemo<Col[]>(
    () =>
      columns.map((column) => ({
        ...column,
        type: column.type ?? "text",
        opts: (column.options ?? []).map((o) =>
          typeof o === "string" ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value, tone: o.tone },
        ),
      })),
    [columns],
  );

  const [data, setData] = useState(rows);
  const [source, setSource] = useState(rows);
  const [sort, setSort] = useState<Sort | null>(null);
  const [filters, setFilters] = useState<Record<string, Filter>>({});
  const [view, setView] = useState<number[]>(() => rows.map((_, i) => i));
  const [history, setHistory] = useState<{ past: T[][]; future: T[][] }>({ past: [], future: [] });

  if (rows !== source) {
    setSource(rows);
    if (rows !== data) {
      setData(rows);
      setView(computeView(rows, cols, sort, filters));
      setHistory({ past: [], future: [] });
    }
  }

  const [sel, setSel] = useState<{ a: Pos; b: Pos }>({ a: { r: 0, c: 0 }, b: { r: 0, c: 0 } });
  const [edit, setEdit] = useState<{ r: number; c: number; draft: string; invalid: boolean } | null>(null);
  const [pick, setPick] = useState<{ r: number; c: number; index: number; below: boolean } | null>(null);
  const [flash, setFlash] = useState<(Range & { id: number }) | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const [port, setPort] = useState({ row: 0, height: 480 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "cells" | "rows"; x: number; y: number; frame: number } | null>(null);
  const typeahead = useRef({ text: "", at: 0 });

  const rowsN = view.length;
  const colsN = cols.length;
  const fit = (p: Pos): Pos => ({ r: clamp(p.r, 0, Math.max(0, rowsN - 1)), c: clamp(p.c, 0, Math.max(0, colsN - 1)) });
  const a = fit(sel.a);
  const b = fit(sel.b);
  const range: Range = {
    r0: Math.min(a.r, b.r),
    r1: Math.max(a.r, b.r),
    c0: Math.min(a.c, b.c),
    c1: Math.max(a.c, b.c),
  };
  const single = range.r0 === range.r1 && range.c0 === range.c1;

  const widthOf = (col: Col) => widths[col.id] ?? col.width ?? defaultWidth[col.type];
  const xs = [GUTTER];
  for (const col of cols) xs.push(xs[xs.length - 1] + widthOf(col));
  const total = xs[colsN];
  const template = `${GUTTER}px ${cols.map((col) => `${widthOf(col)}px`).join(" ")} minmax(0,1fr)`;

  const first = Math.max(0, port.row - OVERSCAN);
  const last = Math.min(rowsN, port.row + Math.ceil(port.height / ROW) + OVERSCAN);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setPort((p) => (p.height === el.clientHeight ? p : { ...p, height: el.clientHeight }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const box = (r0: number, r1: number, c0: number, c1: number) => {
    const left = xs[c0] - (c0 > 0 ? 1 : 0);
    const top = HEAD + r0 * ROW - (r0 > 0 ? 1 : 0);
    return { left, top, width: xs[c1 + 1] - left, height: HEAD + (r1 + 1) * ROW - top };
  };

  const focusGrid = () => scrollRef.current?.focus({ preventScroll: true });

  const reveal = (p: Pos) => {
    const el = scrollRef.current;
    if (!el) return;
    const top = p.r * ROW;
    const viewHeight = el.clientHeight - HEAD;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW > el.scrollTop + viewHeight) el.scrollTop = top + ROW - viewHeight;
    const left = xs[p.c] - GUTTER;
    const right = xs[p.c + 1];
    if (left < el.scrollLeft) el.scrollLeft = left;
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
  };

  const select = (next: Pos, extend = false) => {
    const p = fit(next);
    setSel(extend ? { a, b: p } : { a: p, b: p });
    reveal(p);
  };

  const commitData = (next: T[]) => {
    setHistory((h) => ({ past: [...h.past.slice(-49), data], future: [] }));
    setData(next);
    onChange?.(next);
  };

  const write = (changes: { di: number; id: string; value: unknown }[]) => {
    let next: T[] | null = null;
    for (const { di, id, value } of changes) {
      const row = (next ?? data)[di];
      const before = row[id];
      if (Object.is(before, value) || ((before == null || before === "") && (value == null || value === ""))) continue;
      next ??= data.slice();
      next[di] = { ...row, [id]: value };
    }
    if (next) commitData(next);
  };

  const undo = () => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({ past: history.past.slice(0, -1), future: [data, ...history.future] });
    setData(previous);
    onChange?.(previous);
  };

  const redo = () => {
    const next = history.future[0];
    if (!next) return;
    setHistory({ past: [...history.past, data], future: history.future.slice(1) });
    setData(next);
    onChange?.(next);
  };

  const applyView = (nextSort: Sort | null, nextFilters: Record<string, Filter>) => {
    setSort(nextSort);
    setFilters(nextFilters);
    setView(computeView(data, cols, nextSort, nextFilters));
    setSel((s) => ({ a: { r: 0, c: s.a.c }, b: { r: 0, c: s.a.c } }));
    setEdit(null);
    setPick(null);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const filtered = cols.some((c) => isActive(filters[c.id]));

  const step = (p: Pos, [dr, dc]: [number, number], wrap: boolean): Pos | null => {
    let r = p.r + dr;
    let c = p.c + dc;
    if (wrap && c >= colsN) {
      c = 0;
      r += 1;
    } else if (wrap && c < 0) {
      c = colsN - 1;
      r -= 1;
    }
    if (r < 0 || r >= rowsN || c < 0 || c >= colsN) return wrap ? null : fit({ r, c });
    return { r, c };
  };

  const begin = (initial?: string, at = 0) => {
    if (rowsN === 0) return;
    const col = cols[a.c];
    const row = data[view[a.r]];
    setSel({ a, b: a });
    reveal(a);
    if (col.type === "select" || col.type === "status") {
      let index = col.opts.findIndex((o) => o.value === row[col.id]);
      if (initial) {
        typeahead.current = { text: fold(initial), at };
        const match = col.opts.findIndex((o) => fold(o.label).startsWith(fold(initial)));
        if (match >= 0) index = match;
      }
      const el = scrollRef.current;
      const listHeight = col.opts.length * 32 + 10;
      const below =
        !el ||
        HEAD + (a.r + 1) * ROW + listHeight + 4 <= el.scrollTop + el.clientHeight ||
        a.r * ROW - listHeight - 4 < el.scrollTop;
      setPick({ r: a.r, c: a.c, index: Math.max(0, index), below });
    } else {
      setEdit({ r: a.r, c: a.c, draft: initial ?? rawText(col, row[col.id]), invalid: false });
    }
  };

  const commitEdit = (dir?: [number, number], wrap = false) => {
    if (!edit) return true;
    const col = cols[edit.c];
    const value = parse(col, edit.draft);
    if (value === INVALID) {
      setEdit({ ...edit, invalid: true });
      return false;
    }
    write([{ di: view[edit.r], id: col.id, value }]);
    setEdit(null);
    focusGrid();
    if (dir) {
      const next = step({ r: edit.r, c: edit.c }, dir, wrap);
      if (next) select(next);
    }
    return true;
  };

  const choose = (index: number, dir?: [number, number], wrap = false) => {
    if (!pick) return;
    const col = cols[pick.c];
    const option = col.opts[index];
    if (option) write([{ di: view[pick.r], id: col.id, value: option.value }]);
    setPick(null);
    if (dir) {
      const next = step({ r: pick.r, c: pick.c }, dir, wrap);
      if (next) select(next);
    }
  };

  const copyText = () => {
    const lines: string[] = [];
    for (let r = range.r0; r <= range.r1; r++) {
      const row = data[view[r]];
      const cells: string[] = [];
      for (let c = range.c0; c <= range.c1; c++) cells.push(quote(rawText(cols[c], row[cols[c].id])));
      lines.push(cells.join("\t"));
    }
    return lines.join("\n");
  };

  const clearRange = () => {
    const changes: { di: number; id: string; value: unknown }[] = [];
    for (let r = range.r0; r <= range.r1; r++) {
      for (let c = range.c0; c <= range.c1; c++) changes.push({ di: view[r], id: cols[c].id, value: null });
    }
    write(changes);
  };

  const paste = (text: string) => {
    const block = parseTsv(text);
    if (block.length === 0 || rowsN === 0) return;
    const fill = block.length === 1 && block[0].length === 1 && !single;
    const height = fill ? range.r1 - range.r0 + 1 : block.length;
    const width = fill ? range.c1 - range.c0 + 1 : Math.max(...block.map((line) => line.length));
    const r1 = Math.min(rowsN - 1, range.r0 + height - 1);
    const c1 = Math.min(colsN - 1, range.c0 + width - 1);
    const changes: { di: number; id: string; value: unknown }[] = [];
    for (let r = range.r0; r <= r1; r++) {
      for (let c = range.c0; c <= c1; c++) {
        const cellText = fill ? block[0][0] : block[r - range.r0]?.[c - range.c0];
        if (cellText === undefined) continue;
        const value = parse(cols[c], cellText);
        if (value !== INVALID) changes.push({ di: view[r], id: cols[c].id, value });
      }
    }
    write(changes);
    setSel({ a: { r: range.r0, c: range.c0 }, b: { r: r1, c: c1 } });
    setFlash({ id: (flash?.id ?? 0) + 1, r0: range.r0, r1, c0: range.c0, c1 });
  };

  useEffect(() => {
    const owns = () => scrollRef.current != null && document.activeElement === scrollRef.current && rowsN > 0;
    const onCopy = (event: ClipboardEvent) => {
      if (!owns() || pick) return;
      event.preventDefault();
      event.clipboardData?.setData("text/plain", copyText());
    };
    const onCut = (event: ClipboardEvent) => {
      if (!owns() || pick) return;
      onCopy(event);
      clearRange();
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!owns() || pick) return;
      const text = event.clipboardData?.getData("text/plain");
      if (text == null || text === "") return;
      event.preventDefault();
      paste(text);
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  });

  const posAt = (clientX: number, clientY: number): Pos => {
    const el = scrollRef.current!;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft;
    const y = clientY - rect.top + el.scrollTop - HEAD;
    let c = colsN - 1;
    for (let i = 0; i < colsN; i++) {
      if (x < xs[i + 1]) {
        c = i;
        break;
      }
    }
    return fit({ r: Math.floor(y / ROW), c });
  };

  const extendTo = (clientX: number, clientY: number) => {
    const d = drag.current;
    if (!d) return;
    const p = posAt(clientX, clientY);
    setSel((s) => {
      const next = d.mode === "rows" ? { r: p.r, c: colsN - 1 } : p;
      return s.b.r === next.r && s.b.c === next.c ? s : { a: s.a, b: next };
    });
  };

  const autoScroll = () => {
    const d = drag.current;
    const el = scrollRef.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    const edge = (pos: number, start: number, end: number) =>
      pos < start ? -Math.min(24, (start - pos) / 2) : pos > end ? Math.min(24, (pos - end) / 2) : 0;
    const dy = edge(d.y, rect.top + HEAD + 6, rect.bottom - 6);
    const dx = d.mode === "rows" ? 0 : edge(d.x, rect.left + GUTTER + 6, rect.right - 6);
    if (dx || dy) {
      el.scrollTop += dy;
      el.scrollLeft += dx;
      extendTo(d.x, d.y);
    }
    d.frame = requestAnimationFrame(autoScroll);
  };

  const onBodyPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || rowsN === 0) return;
    const target = event.target as HTMLElement;
    const gutter = target.closest("[data-gutter]");
    if (!gutter && !target.closest("[data-cell]")) return;
    if (edit && !commitEdit()) return;
    setPick(null);
    const p = posAt(event.clientX, event.clientY);
    const touch = event.pointerType === "touch";
    if (!touch) event.preventDefault();
    focusGrid();
    if (gutter) {
      const anchor = event.shiftKey ? a.r : p.r;
      setSel({ a: { r: anchor, c: 0 }, b: { r: p.r, c: colsN - 1 } });
    } else {
      setSel(event.shiftKey ? { a, b: p } : { a: p, b: p });
    }
    if (touch) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode: gutter ? "rows" : "cells", x: event.clientX, y: event.clientY, frame: 0 };
    drag.current.frame = requestAnimationFrame(autoScroll);
  };

  const onBodyPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.x = event.clientX;
    d.y = event.clientY;
    extendTo(event.clientX, event.clientY);
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    cancelAnimationFrame(d.frame);
    drag.current = null;
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>, col: Col) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = widthOf(col);
    const sign = direction === "rtl" ? -1 : 1;
    handle.setPointerCapture(event.pointerId);
    setResizing(col.id);
    const move = (e: PointerEvent) => {
      const width = Math.round(clamp(startWidth + (e.clientX - startX) * sign, MIN_WIDTH, MAX_WIDTH));
      setWidths((w) => (w[col.id] === width ? w : { ...w, [col.id]: width }));
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      setResizing(null);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  };

  const onPickKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!pick) return;
    const n = cols[pick.c].opts.length;
    const go = (index: number) => setPick({ ...pick, index: clamp(index, 0, n - 1) });
    switch (event.key) {
      case "ArrowDown":
        go(pick.index + 1);
        break;
      case "ArrowUp":
        go(pick.index - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(n - 1);
        break;
      case "Enter":
        choose(pick.index, event.shiftKey ? [-1, 0] : [1, 0]);
        break;
      case "Tab":
        choose(pick.index, event.shiftKey ? [0, -1] : [0, 1], true);
        break;
      case "Escape":
        setPick(null);
        break;
      default: {
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
        const now = event.timeStamp;
        const t = typeahead.current;
        const text = (now - t.at < 700 ? t.text : "") + fold(event.key);
        typeahead.current = { text, at: now };
        const opts = cols[pick.c].opts;
        const match = opts.findIndex((o) => fold(o.label).startsWith(text));
        if (match >= 0) go(match);
      }
    }
    event.preventDefault();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || rowsN === 0) return;
    if (pick) return onPickKey(event);
    const mod = event.metaKey || event.ctrlKey;
    const { key, shiftKey } = event;
    const flip = direction === "rtl" ? -1 : 1;
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -flip],
      ArrowRight: [0, flip],
    };
    if (key in arrows) {
      event.preventDefault();
      if (event.altKey && key === "ArrowDown") {
        setMenu(cols[a.c].id);
        return;
      }
      const [dr, dc] = arrows[key];
      const from = shiftKey ? b : a;
      const target = mod
        ? { r: dr ? (dr < 0 ? 0 : rowsN - 1) : from.r, c: dc ? (dc < 0 ? 0 : colsN - 1) : from.c }
        : { r: from.r + dr, c: from.c + dc };
      select(target, shiftKey);
      return;
    }
    switch (key) {
      case "Tab": {
        const next = step(a, shiftKey ? [0, -1] : [0, 1], true);
        if (!next) return;
        event.preventDefault();
        select(next);
        return;
      }
      case "Enter":
      case "F2":
        event.preventDefault();
        begin();
        return;
      case "Escape":
        if (!single) {
          event.preventDefault();
          setSel({ a, b: a });
        }
        return;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        clearRange();
        return;
      case "Home":
      case "End": {
        event.preventDefault();
        const end = key === "End";
        select({ r: mod ? (end ? rowsN - 1 : 0) : (shiftKey ? b : a).r, c: end ? colsN - 1 : 0 }, shiftKey);
        return;
      }
      case "PageUp":
      case "PageDown": {
        event.preventDefault();
        const pageRows = Math.max(1, Math.floor(((scrollRef.current?.clientHeight ?? 400) - HEAD) / ROW) - 1);
        const from = shiftKey ? b : a;
        select({ r: from.r + (key === "PageUp" ? -pageRows : pageRows), c: from.c }, shiftKey);
        return;
      }
    }
    if (mod) {
      const k = key.toLowerCase();
      if (k === "a") {
        event.preventDefault();
        setSel({ a: { r: 0, c: 0 }, b: { r: rowsN - 1, c: colsN - 1 } });
      } else if (k === "z") {
        event.preventDefault();
        if (shiftKey) redo();
        else undo();
      } else if (k === "y") {
        event.preventDefault();
        redo();
      }
      return;
    }
    if (key.length === 1 && !event.altKey) {
      event.preventDefault();
      begin(key, event.timeStamp);
    }
  };

  const counts = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const col of cols) {
      if (col.type !== "select" && col.type !== "status") continue;
      const tally = new Map<string, number>();
      for (const row of data) {
        const key = String(row[col.id] ?? "");
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
      map.set(col.id, tally);
    }
    return map;
  }, [cols, data]);

  const stats = useMemo(() => {
    let count = 0;
    let sum = 0;
    const from = new Set<string>();
    if (rowsN === 0) return { count, sum, from, cells: 0 };
    for (let r = range.r0; r <= range.r1; r++) {
      const row = data[view[r]];
      for (let c = range.c0; c <= range.c1; c++) {
        const col = cols[c];
        const value = row[col.id];
        if (col.type === "number" && typeof value === "number") {
          count++;
          sum += value;
          from.add(col.id);
        }
      }
    }
    return { count, sum, from, cells: (range.r1 - range.r0 + 1) * (range.c1 - range.c0 + 1) };
  }, [range.r0, range.r1, range.c0, range.c1, data, view, cols, rowsN]);

  const statFormat = (value: number) => {
    const only = stats.from.size === 1 ? cols.find((c) => stats.from.has(c.id)) : undefined;
    return only?.format ? only.format(value) : fmt.format(value);
  };

  const outline = rowsN > 0 ? box(range.r0, range.r1, range.c0, range.c1) : null;
  const activeCol = cols[a.c];
  const pickCol = pick ? cols[pick.c] : null;
  const pickListHeight = pickCol ? pickCol.opts.length * 32 + 10 : 0;
  const pickBelow = pick?.below ?? true;
  const editCol = edit ? cols[edit.c] : null;
  const motionless = reduce ? "" : "transition-[transform,width,height] duration-[90ms] ease-out";
  const activeId = pick ? `${prefix}-option-${pick.index}` : rowsN > 0 && !edit ? `${prefix}-${a.r}-${a.c}` : undefined;

  const position = (r0: number, r1: number, c0: number, c1: number): CSSProperties => {
    const g = box(r0, r1, c0, c1);
    return { transform: `translate(${g.left}px, ${g.top}px)`, width: g.width, height: g.height };
  };

  return (
    <div
      {...props}
      className={cn(
        "group/grid relative flex min-h-60 flex-col overflow-clip rounded-xl border border-border bg-card text-foreground",
        className,
      )}
    >
      <style href="miyuki-data-grid" precedence="miyuki">
        {keyframes}
      </style>
      <div
        ref={scrollRef}
        role="grid"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-rowcount={rowsN + 1}
        aria-colcount={colsN + 1}
        aria-multiselectable="true"
        aria-activedescendant={activeId}
        onKeyDown={onKeyDown}
        onScroll={(event) => {
          const row = Math.floor(event.currentTarget.scrollTop / ROW);
          setPort((p) => (p.row === row ? p : { ...p, row }));
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPick(null);
        }}
        className="relative min-h-0 flex-1 basis-0 overflow-auto overscroll-contain outline-none"
      >
        <div className="relative isolate" style={{ width: total, minWidth: "100%", height: HEAD + rowsN * ROW }}>
          <div
            role="row"
            aria-rowindex={1}
            className="sticky top-0 z-20 grid"
            style={{ gridTemplateColumns: template, height: HEAD }}
          >
            <div role="columnheader" className={cn("sticky left-0 z-10 border-e border-b border-border", chrome)}>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Select all cells"
                onClick={() => {
                  if (rowsN === 0) return;
                  setSel({ a: { r: 0, c: 0 }, b: { r: rowsN - 1, c: colsN - 1 } });
                  focusGrid();
                }}
                className="group/corner relative size-full outline-none"
              >
                <span
                  aria-hidden="true"
                  className="absolute end-1.5 bottom-1.5 size-2 bg-muted-foreground/35 transition-colors duration-150 [clip-path:polygon(100%_0,100%_100%,0_100%)] group-hover/corner:bg-muted-foreground/70"
                />
              </button>
            </div>
            {cols.map((col, c) => {
              const inRange = rowsN > 0 && c >= range.c0 && c <= range.c1;
              const sorted = sort?.id === col.id ? sort.dir : null;
              const hasFilter = isActive(filters[col.id]);
              return (
                <div
                  key={col.id}
                  role="columnheader"
                  aria-colindex={c + 2}
                  aria-sort={sorted === 1 ? "ascending" : sorted === -1 ? "descending" : undefined}
                  className={cn(
                    "group/head relative min-w-0 border-e border-b border-border transition-colors duration-100",
                    inRange ? "bg-[color-mix(in_oklab,var(--brand-soft)_75%,var(--card))]" : chrome,
                  )}
                >
                  <PopoverTrigger isOpen={menu === col.id} onOpenChange={(open) => setMenu(open ? col.id : null)}>
                    <AriaButton
                      className={({ isHovered, isPressed, isFocusVisible }) =>
                        cn(
                          "flex size-full min-w-0 cursor-default items-center gap-1.5 px-2 text-[13px] font-medium outline-none select-none",
                          "transition-colors duration-100 [&_svg]:size-3.5 [&_svg]:shrink-0",
                          inRange ? "text-brand-strong" : "text-muted-foreground",
                          (isHovered || isPressed || menu === col.id) && "bg-foreground/[0.04] text-foreground",
                          isFocusVisible && "ring-[3px] ring-ring ring-inset",
                        )
                      }
                    >
                      <span aria-hidden="true" className="opacity-80">
                        {typeIcon[col.type]}
                      </span>
                      <span className="truncate">{col.name}</span>
                      {sorted && (
                        <span aria-hidden="true" className="text-foreground">
                          {sorted === 1 ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
                        </span>
                      )}
                      {hasFilter && (
                        <span aria-label="Filtered" className="text-brand-strong">
                          <ListFilter />
                        </span>
                      )}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn("ms-auto hidden opacity-70 group-hover/head:block", menu === col.id && "block")}
                      />
                    </AriaButton>
                    <Popover placement="bottom start" offset={4} className="w-60 p-1" aria-label={`${col.name} column`}>
                      {({ close }) => (
                        <ColumnMenu
                          col={col}
                          sort={sort}
                          filter={filters[col.id]}
                          counts={counts.get(col.id) ?? new Map()}
                          close={close}
                          onResize={(delta) =>
                            setWidths((w) => ({
                              ...w,
                              [col.id]: Math.round(clamp(widthOf(col) + delta, MIN_WIDTH, MAX_WIDTH)),
                            }))
                          }
                          onSort={(dir) => applyView(dir ? { id: col.id, dir } : null, filters)}
                          onFilter={(filter) => {
                            const next = { ...filters };
                            if (filter) next[col.id] = filter;
                            else delete next[col.id];
                            applyView(sort, next);
                          }}
                        />
                      )}
                    </Popover>
                  </PopoverTrigger>
                  <div
                    aria-hidden="true"
                    onPointerDown={(event) => startResize(event, col)}
                    onDoubleClick={() =>
                      setWidths((w) => {
                        const next = { ...w };
                        delete next[col.id];
                        return next;
                      })
                    }
                    className={cn(
                      "absolute inset-y-0 -end-[5px] z-10 w-[9px] cursor-col-resize touch-none",
                      "after:absolute after:inset-y-1.5 after:start-1 after:w-px after:rounded-full after:bg-brand after:opacity-0 after:transition-opacity after:duration-150",
                      "hover:after:opacity-100",
                      resizing === col.id && "after:inset-y-0 after:w-0.5 after:opacity-100",
                    )}
                  />
                </div>
              );
            })}
            <div aria-hidden="true" className={cn("border-b border-border", chrome)} />
          </div>

          <div
            role="rowgroup"
            onPointerDown={onBodyPointerDown}
            onPointerMove={onBodyPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onDoubleClick={(event) => {
              if (!(event.target as HTMLElement).closest("[data-cell]") || event.shiftKey) return;
              const p = posAt(event.clientX, event.clientY);
              if (p.r === a.r && p.c === a.c) begin();
            }}
          >
            <div aria-hidden="true" style={{ height: first * ROW }} />
            {view.slice(first, last).map((di, i) => {
              const r = first + i;
              const marked = rowsN > 0 && r >= range.r0 && r <= range.r1;
              return (
                <GridRow
                  key={di}
                  r={r}
                  row={data[di]}
                  cols={cols}
                  template={template}
                  marked={marked}
                  span={marked ? [range.c0, range.c1] : null}
                  prefix={prefix}
                  fmt={fmt}
                />
              );
            })}
          </div>

          {outline && !single && (
            <>
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-0 left-0 z-[-2] bg-brand/[0.07] dark:bg-brand/[0.12]",
                  motionless,
                )}
                style={position(range.r0, range.r1, range.c0, range.c1)}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-[-1] bg-card"
                style={{ left: xs[a.c], top: HEAD + a.r * ROW, width: xs[a.c + 1] - xs[a.c] - 1, height: ROW - 1 }}
              />
            </>
          )}
          {flash && rowsN > 0 && (
            <div
              key={flash.id}
              aria-hidden="true"
              onAnimationEnd={() => setFlash(null)}
              className="pointer-events-none absolute top-0 left-0 z-[-1] animate-[miyuki-data-grid-flash_900ms_ease-out_forwards] motion-reduce:animate-[miyuki-data-grid-flash_300ms_ease-out_forwards]"
              style={position(flash.r0, flash.r1, flash.c0, flash.c1)}
            />
          )}
          {outline && !edit && (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-0 left-0 z-[5] rounded-[3px] border-2 border-brand/45 group-focus-within/grid:border-brand",
                motionless,
              )}
              style={position(range.r0, range.r1, range.c0, range.c1)}
            >
              {single && (activeCol.type === "select" || activeCol.type === "status") && (
                <ChevronDown className="absolute end-1 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          )}
          {resizing && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 z-[25] w-0.5 bg-brand"
              style={{ left: xs[cols.findIndex((c) => c.id === resizing) + 1] - 1.5, height: HEAD + rowsN * ROW }}
            />
          )}

          {edit && editCol && (
            <input
              autoFocus
              spellCheck={false}
              autoComplete="off"
              aria-label={`${editCol.name}, row ${edit.r + 1}`}
              aria-invalid={edit.invalid || undefined}
              inputMode={editCol.type === "number" ? "decimal" : undefined}
              value={edit.draft}
              onChange={(event) => setEdit({ ...edit, draft: event.target.value, invalid: false })}
              onFocus={(event) => {
                const input = event.currentTarget;
                input.setSelectionRange(input.value.length, input.value.length);
              }}
              onBlur={(event) => {
                if (event.relatedTarget === scrollRef.current) return;
                if (!commitEdit()) setEdit(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitEdit(event.shiftKey ? [-1, 0] : [1, 0]);
                } else if (event.key === "Tab") {
                  event.preventDefault();
                  commitEdit(event.shiftKey ? [0, -1] : [0, 1], true);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setEdit(null);
                  focusGrid();
                }
              }}
              className={cn(
                "absolute z-[6] rounded-[3px] bg-card px-2 text-[13px] text-foreground shadow-md outline-none",
                "ring-2 ring-brand",
                editCol.type === "number" && "text-end tabular-nums",
                edit.invalid && "ring-destructive",
              )}
              style={{
                left: xs[edit.c] - 1,
                top: HEAD + edit.r * ROW - 1,
                width: xs[edit.c + 1] - xs[edit.c] + 1,
                height: ROW + 1,
              }}
            />
          )}
          {edit?.invalid && editCol && (
            <p
              role="alert"
              className="absolute z-[6] rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground shadow-md"
              style={{ left: xs[edit.c] - 1, top: HEAD + (edit.r + 1) * ROW + 4 }}
            >
              Enter a number
            </p>
          )}

          {pick && pickCol && (
            <div
              id={`${prefix}-list`}
              role="listbox"
              aria-label={pickCol.name}
              onPointerDown={(event) => event.preventDefault()}
              className={cn(
                "absolute z-30 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
                "animate-[miyuki-data-grid-in_160ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",
                !pickBelow && "[--miyuki-data-grid-from:4px]",
              )}
              style={{
                left: xs[pick.c] - 1,
                top: pickBelow ? HEAD + (pick.r + 1) * ROW + 4 : HEAD + pick.r * ROW - pickListHeight - 4,
                minWidth: Math.max(176, xs[pick.c + 1] - xs[pick.c] + 1),
              }}
            >
              {pickCol.opts.map((option, i) => {
                const current = data[view[pick.r]]?.[pickCol.id] === option.value;
                return (
                  <div
                    key={option.value}
                    id={`${prefix}-option-${i}`}
                    role="option"
                    aria-selected={current}
                    onPointerEnter={() => setPick({ ...pick, index: i })}
                    onClick={() => {
                      choose(i);
                      focusGrid();
                    }}
                    className={cn(
                      "flex h-8 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground select-none",
                      i === pick.index && "bg-accent",
                    )}
                  >
                    {pickCol.type === "status" ? (
                      <Badge tone={option.tone ?? "neutral"} size="sm" dot>
                        {option.label}
                      </Badge>
                    ) : (
                      <span className="truncate">{option.label}</span>
                    )}
                    <Check
                      aria-hidden="true"
                      strokeWidth={2.25}
                      className={cn("ms-auto size-4 shrink-0 text-brand-strong", !current && "invisible")}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {rowsN === 0 && (
          <div
            className="absolute inset-x-0 flex flex-col items-center gap-3 px-4 py-12 text-center"
            style={{ top: HEAD }}
          >
            <p className="text-sm text-muted-foreground">No rows match these filters.</p>
            <Button variant="secondary" size="sm" onPress={() => applyView(sort, {})}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex h-9 shrink-0 items-center gap-4 border-t border-border px-3 text-[13px] whitespace-nowrap text-muted-foreground tabular-nums",
          chrome,
        )}
      >
        <span>
          {filtered ? `${fmt.format(rowsN)} of ${fmt.format(data.length)} rows` : `${fmt.format(data.length)} rows`}
        </span>
        {filtered && (
          <button
            type="button"
            onClick={() => applyView(sort, {})}
            className="rounded-sm font-medium text-brand-strong outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Clear filters
          </button>
        )}
        <div className="ms-auto flex min-w-0 items-center gap-4 overflow-hidden">
          {stats.cells > 1 && stats.count > 0 ? (
            <>
              <span>
                Count <span className="font-medium text-foreground">{fmt.format(stats.count)}</span>
              </span>
              <span>
                Sum <span className="font-medium text-foreground">{statFormat(stats.sum)}</span>
              </span>
              <span className="hidden sm:inline">
                Average <span className="font-medium text-foreground">{statFormat(stats.sum / stats.count)}</span>
              </span>
            </>
          ) : stats.cells > 1 ? (
            <span>{fmt.format(stats.cells)} cells</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

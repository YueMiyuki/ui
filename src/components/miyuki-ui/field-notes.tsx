"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BrushAnnotation, type BrushAnnotationKind } from "@/components/miyuki-ui/brush-annotation";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { cn } from "@/lib/utils";

interface Entry {
  anchor: HTMLElement;
  end: HTMLElement;
  note: HTMLElement | null;
  probe: HTMLElement | null;
  mark?: BrushAnnotationKind;
}

interface Connector {
  id: string;
  under: string;
  lead: string;
}

interface FieldNotesState {
  wide: boolean;
  active: string | null;
  seen: Set<string>;
  setActive: (id: string | null) => void;
  register: (id: string, entry: Entry) => () => void;
  registerFigure: (el: HTMLElement) => () => void;
}

const Context = createContext<FieldNotesState | null>(null);

const WIDE_REM = 52;
const GAP = 12;
const r1 = (v: number) => Math.round(v * 10) / 10;

type Pt = [number, number];

function sample(segments: ((t: number) => Pt)[], step = 5) {
  const out: Pt[] = [];
  segments.forEach((seg, k) => {
    const a = seg(0);
    const b = seg(1);
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let i = k === 0 ? 0 : 1; i <= n; i++) out.push(seg(i / n));
  });
  return out;
}

function pencil(seed: string, pts: Pt[], amp = 0.55) {
  const rng = createRng(`field-notes:${seed}`);
  const f1 = rng.range(0.6, 1.1);
  const f2 = rng.range(1.8, 2.8);
  const p1 = rng();
  const p2 = rng();
  let run = 0;
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i > 0) run += Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]);
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const l = Math.hypot(tx, ty) || 1;
    const s = run / 110;
    const w = amp * (0.62 * Math.sin(Math.PI * 2 * (f1 * s + p1)) + 0.38 * Math.sin(Math.PI * 2 * (f2 * s + p2)));
    d += `${i === 0 ? "M" : "L"}${r1(x - (ty / l) * w)} ${r1(y + (tx / l) * w)}`;
  }
  return d;
}

const lerp =
  (a: Pt, b: Pt) =>
  (t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const cubic =
  (a: Pt, c1: Pt, c2: Pt, b: Pt) =>
  (t: number): Pt => {
    const u = 1 - t;
    return [
      u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
      u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
    ];
  };

interface ConnectorShape {
  from: number;
  end: number;
  edge: number;
  base: number;
  fs: number;
  nx: number;
  ny: number;
  under: boolean;
}

function connector(seed: string, o: ConnectorShape) {
  const yu = o.base + o.fs * 0.2;
  const yg = o.base + o.fs * 0.62;
  const tilt = createRng(`field-notes:tilt:${seed}`).range(0.3, 1.1);
  const under = o.under
    ? pencil(`${seed}:u`, sample([lerp([o.from - 1, yu + tilt * 0.5], [o.end + 1, yu - tilt * 0.5])]))
    : "";
  const start: Pt = o.under ? [o.end + 1, yu - tilt * 0.5] : [o.end, o.base - o.fs * 0.3];
  const dip = Math.min(o.edge - 2, start[0] + 16);
  const turn: Pt = [Math.max(dip + 1, o.edge), yg];
  const lead = pencil(
    `${seed}:l`,
    sample([
      cubic(start, [start[0] + 8, start[1]], [dip - 8, yg], [dip, yg]),
      lerp([dip, yg], turn),
      cubic(turn, [turn[0] + (o.nx - turn[0]) * 0.55, yg], [o.nx - (o.nx - turn[0]) * 0.4, o.ny], [o.nx, o.ny]),
    ]),
  );
  return { under, lead };
}

export type FieldNotesProps = ComponentProps<"article">;

export function FieldNotes({ className, children, style, ...props }: FieldNotesProps) {
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const entries = useRef(new Map<string, Entry>());
  const figures = useRef(new Set<HTMLElement>());
  const wideRef = useRef(false);
  const frame = useRef(0);
  const observer = useRef<ResizeObserver | null>(null);
  const [wide, setWide] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [extra, setExtra] = useState(0);
  const extraRef = useRef(0);
  const ioRef = useRef<IntersectionObserver | null>(null);

  const measure = useCallback(() => {
    const art = root.current;
    const g = grid.current;
    if (!art || !g) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const isWide = art.offsetWidth >= WIDE_REM * rem;
    if (isWide !== wideRef.current) {
      wideRef.current = isWide;
      setWide(isWide);
      return;
    }
    if (!isWide) {
      setConnectors((prev) => (prev.length ? [] : prev));
      setExtra((prev) => (prev ? 0 : prev));
      return;
    }
    const box = art.getBoundingClientRect();
    const k = art.offsetWidth > 0 ? box.width / art.offsetWidth : 1;
    const lx = (x: number) => (x - box.left) / k;
    const ly = (y: number) => (y - box.top) / k;
    const tracks = getComputedStyle(g)
      .gridTemplateColumns.split(" ")
      .map((v) => parseFloat(v))
      .filter((v) => Number.isFinite(v));
    if (tracks.length < 3) return;
    const gridLeft = lx(g.getBoundingClientRect().left);
    const textRight = gridLeft + tracks[0];
    const marginLeft = textRight + tracks[1];
    const marginWidth = tracks[2];

    const obstacles = [...figures.current].map((el) => {
      const r = el.getBoundingClientRect();
      return [ly(r.top) - GAP * 2, ly(r.bottom) + GAP * 2] as const;
    });

    const items = [...entries.current.entries()]
      .filter(([, e]) => e.note && e.probe)
      .map(([id, e]) => {
        const note = e.note as HTMLElement;
        note.style.left = `${marginLeft}px`;
        note.style.width = `${marginWidth}px`;
        const end = e.end.getBoundingClientRect();
        const ex = lx(end.left);
        const ey = ly(end.top);
        const rects = Array.from(e.anchor.getClientRects()).filter((r) => r.width > 0.5);
        const lastLine = rects.filter((r) => Math.abs(ly(r.bottom) - ey) < (r.height / k) * 0.9);
        const lineLeft = lastLine.length ? Math.min(...lastLine.map((r) => lx(r.left))) : ex;
        const fs = parseFloat(getComputedStyle(e.anchor).fontSize) || 16;
        const offset = (e.probe as HTMLElement).offsetTop;
        return { id, e, note, ex, ey, lineLeft, fs, offset, height: note.offsetHeight, top: ey - offset };
      })
      .sort((a, b) => a.top - b.top);

    let floor = -Infinity;
    for (const item of items) {
      let top = Math.max(item.top, floor);
      for (let guard = 0; guard < 6; guard++) {
        const hit = obstacles.find(([a, b]) => top < b && top + item.height > a);
        if (!hit) break;
        top = hit[1];
      }
      item.top = top;
      floor = top + item.height + GAP * 1.5;
      item.note.style.top = `${r1(top)}px`;
      item.note.dataset.placed = "";
    }

    const next = items.map((item) => {
      const mark = item.e.mark;
      const end = mark === "circle" ? item.ex + item.fs * 0.55 : mark ? item.ex + item.fs * 0.25 : item.ex;
      return {
        id: item.id,
        ...connector(item.id, {
          from: item.lineLeft,
          end,
          edge: textRight + 10,
          base: item.ey,
          fs: item.fs,
          nx: marginLeft - 8,
          ny: item.top + item.offset - 4,
          under: !mark,
        }),
      };
    });
    setConnectors((prev) =>
      prev.length === next.length &&
      prev.every((c, i) => c.id === next[i].id && c.under === next[i].under && c.lead === next[i].lead)
        ? prev
        : next,
    );
    const bottom = items.reduce((m, it) => Math.max(m, it.top + it.height), 0);
    const content = art.offsetHeight - extraRef.current;
    const need = Math.max(0, Math.ceil(bottom - content + 8));
    if (need !== extraRef.current) {
      extraRef.current = need;
      setExtra(need);
    }
  }, []);

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  useLayoutEffect(() => {
    measure();
  }, [measure, wide]);

  useEffect(() => {
    const art = root.current;
    if (!art) return;
    const ro = new ResizeObserver(schedule);
    observer.current = ro;
    ro.observe(art);
    entries.current.forEach((e) => e.note && ro.observe(e.note));
    window.addEventListener("resize", schedule);
    let alive = true;
    document.fonts?.ready.then(() => alive && schedule());
    return () => {
      alive = false;
      cancelAnimationFrame(frame.current);
      ro.disconnect();
      observer.current = null;
      window.removeEventListener("resize", schedule);
    };
  }, [schedule]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (list) => {
        const hits = list.filter((x) => x.isIntersecting).map((x) => (x.target as HTMLElement).dataset.fieldNote ?? "");
        if (hits.length) setSeen((prev) => (hits.every((h) => prev.has(h)) ? prev : new Set([...prev, ...hits])));
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.5 },
    );
    entries.current.forEach((e) => io.observe(e.anchor));
    ioRef.current = io;
    return () => {
      io.disconnect();
      ioRef.current = null;
    };
  }, []);

  const register = useCallback(
    (id: string, entry: Entry) => {
      entries.current.set(id, entry);
      entry.anchor.dataset.fieldNote = id;
      ioRef.current?.observe(entry.anchor);
      if (entry.note) observer.current?.observe(entry.note);
      schedule();
      return () => {
        entries.current.delete(id);
        ioRef.current?.unobserve(entry.anchor);
        if (entry.note) observer.current?.unobserve(entry.note);
        schedule();
      };
    },
    [schedule],
  );

  const registerFigure = useCallback(
    (el: HTMLElement) => {
      figures.current.add(el);
      schedule();
      return () => {
        figures.current.delete(el);
        schedule();
      };
    },
    [schedule],
  );

  const state = useMemo<FieldNotesState>(
    () => ({ wide, active, seen, setActive, register, registerFigure }),
    [wide, active, seen, register, registerFigure],
  );

  return (
    <article
      {...props}
      ref={root}
      className={cn("@container/field-notes relative isolate mx-auto w-full max-w-[56rem]", className)}
      style={{ paddingBottom: extra || undefined, ...style }}
    >
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full overflow-visible">
        {connectors.map((c) => {
          const on = reduced || seen.has(c.id);
          const lit = active === c.id;
          const draw = (delay: number, duration: number) => ({
            initial: { pathLength: reduced ? 1 : 0 },
            animate: { pathLength: on ? 1 : 0 },
            transition: reduced ? { duration: 0 } : { duration, delay, ease: [0.45, 0.05, 0.25, 1] as const },
          });
          return (
            <g key={c.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {c.under ? (
                <motion.path
                  d={c.under}
                  strokeWidth={1.3}
                  className={cn(
                    "transition-[stroke] duration-200",
                    lit ? "stroke-brand" : "stroke-muted-foreground/75 dark:stroke-muted-foreground/80",
                  )}
                  {...draw(0, 0.35)}
                />
              ) : null}
              <motion.path
                d={c.lead}
                strokeWidth={1}
                className={cn(
                  "transition-[stroke] duration-200",
                  lit ? "stroke-brand/80" : "stroke-muted-foreground/40 dark:stroke-muted-foreground/45",
                )}
                {...draw(c.under ? 0.3 : 0.6, 0.8)}
              />
            </g>
          );
        })}
      </svg>
      <div
        ref={grid}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] text-[17px]/[1.75] text-foreground/90 *:[grid-column:1/-1]",
          "@min-[52rem]/field-notes:[grid-template-columns:[text-start]_minmax(0,36rem)_[text-end]_3rem_[margin-start]_minmax(0,1fr)_[margin-end]]",
          "@min-[52rem]/field-notes:*:[grid-column:text]",
          "[&>*+*]:mt-6",
        )}
      >
        <Context value={state}>{children}</Context>
      </div>
    </article>
  );
}

export interface NoteProps extends Omit<ComponentProps<"span">, "children"> {
  note: ReactNode;
  children: ReactNode;
  label?: string;
  mark?: BrushAnnotationKind;
  markColor?: string;
}

export function Note({ note, children, label = "Margin note", mark, markColor, className, ...props }: NoteProps) {
  const ctx = useContext(Context);
  const reduced = useReducedMotion() ?? false;
  const id = useId();
  const noteId = `${id}-note`;
  const anchor = useRef<HTMLSpanElement>(null);
  const end = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const wide = ctx?.wide ?? false;
  const register = ctx?.register;
  const active = ctx?.active === id;
  const seen = ctx?.seen.has(id) ?? false;

  useLayoutEffect(() => {
    if (!register || !anchor.current || !end.current) return;
    return register(id, {
      anchor: anchor.current,
      end: end.current,
      note: wide ? noteRef.current : null,
      probe: wide ? probe.current : null,
      mark,
    });
  }, [register, id, wide, mark]);

  const hover = {
    onPointerEnter: () => ctx?.setActive(id),
    onPointerLeave: () => ctx?.setActive(null),
  };

  return (
    <>
      <span
        {...props}
        {...hover}
        ref={anchor}
        onClick={(e) => {
          props.onClick?.(e);
          if (!wide) setOpen((o) => !o);
        }}
        className={cn(
          "transition-colors duration-200",
          !wide &&
            "cursor-pointer underline decoration-brand/50 decoration-dotted decoration-[1.5px] underline-offset-[5px]",
          active && wide && "text-foreground",
          className,
        )}
      >
        {mark ? (
          <BrushAnnotation kind={mark} color={markColor} className={mark === "circle" ? "mx-[0.3em]" : undefined}>
            {children}
          </BrushAnnotation>
        ) : (
          children
        )}
        <span ref={end} aria-hidden="true" className="inline-block h-0 w-0 align-baseline" />
      </span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={noteId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative mx-0.5 inline-grid size-[1.15rem] translate-y-[-0.1em] cursor-pointer place-items-center rounded-full align-middle outline-none",
          "bg-brand-soft text-brand-strong transition-[background-color,color] duration-150 hover:bg-brand hover:text-brand-foreground",
          "before:absolute before:-inset-1 before:content-['']",
          "focus-visible:ring-[3px] focus-visible:ring-ring",
          "@min-[52rem]/field-notes:hidden",
        )}
      >
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={cn("size-2.5 transition-transform duration-200 ease-settle", open && "rotate-45")}
        >
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {wide ? (
        <span
          {...hover}
          ref={noteRef}
          id={noteId}
          role="note"
          className={cn(
            "absolute block text-[13px]/5 text-pretty text-muted-foreground opacity-0 transition-[opacity,color] duration-500",
            (seen || reduced) && "data-[placed]:opacity-100",
            !reduced && "delay-300",
            active && "text-foreground",
          )}
        >
          <span ref={probe} aria-hidden="true" className="inline-block h-0 w-0 align-baseline" />
          {note}
        </span>
      ) : (
        <AnimatePresence initial={false}>
          {open ? (
            <motion.span
              key="note"
              id={noteId}
              role="note"
              className="block overflow-hidden"
              initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.1 } }
                  : { height: 0, opacity: 0, transition: { duration: 0.16 } }
              }
              transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 34 }}
            >
              <span className="my-3 block border-l-2 border-brand/50 bg-brand-soft/40 py-2.5 pr-3 pl-3.5 text-[15px]/6 text-pretty text-foreground/85 dark:bg-brand-soft/30">
                {note}
              </span>
            </motion.span>
          ) : null}
        </AnimatePresence>
      )}
    </>
  );
}

export interface FigureProps extends Omit<ComponentProps<"figure">, "children"> {
  src?: string;
  alt?: string;
  caption?: ReactNode;
  children?: ReactNode;
}

export function Figure({ src, alt = "", caption, children, className, ...props }: FigureProps) {
  const ctx = useContext(Context);
  const ref = useRef<HTMLElement>(null);
  const registerFigure = ctx?.registerFigure;
  const wide = ctx?.wide ?? false;

  useLayoutEffect(() => {
    if (!registerFigure || !ref.current || !wide) return;
    return registerFigure(ref.current);
  }, [registerFigure, wide]);

  return (
    <figure
      {...props}
      ref={ref}
      className={cn("mt-10! mb-4! @min-[52rem]/field-notes:[grid-column:text-start/margin-end]!", className)}
    >
      <div className="overflow-clip rounded-xl bg-muted ring-1 ring-foreground/5">
        {children ?? <img src={src} alt={alt} draggable={false} className="aspect-[16/8] w-full object-cover" />}
      </div>
      {caption ? (
        <figcaption className="mt-3 max-w-[36rem] text-[13px]/5 text-pretty text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

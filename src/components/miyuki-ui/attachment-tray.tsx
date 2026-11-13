"use client";

import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
  Presentation,
  Route,
} from "lucide-react";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export interface AttachmentTrayItem {
  id: string;
  name: string;
  type?: string;
  src?: string;
}

interface Kind {
  icon: LucideIcon;
  tint?: string;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const LEAVE: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] };
const STAGGER = 0.05;
const STAGGER_CAP = 0.35;

const kinds: Record<string, Kind> = {
  image: { icon: FileImage, tint: "var(--chart-1)" },
  sheet: { icon: FileSpreadsheet, tint: "var(--chart-2)" },
  pdf: { icon: FileText, tint: "var(--chart-6)" },
  text: { icon: FileText, tint: "var(--chart-3)" },
  slides: { icon: Presentation, tint: "var(--chart-4)" },
  route: { icon: Route, tint: "var(--chart-1)" },
  code: { icon: FileCode, tint: "var(--chart-3)" },
  archive: { icon: FileArchive },
  other: { icon: File },
};

const extensions: Record<string, keyof typeof kinds> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  gif: "image",
  heic: "image",
  avif: "image",
  svg: "image",
  xlsx: "sheet",
  xls: "sheet",
  csv: "sheet",
  tsv: "sheet",
  numbers: "sheet",
  ods: "sheet",
  pdf: "pdf",
  doc: "text",
  docx: "text",
  txt: "text",
  md: "text",
  rtf: "text",
  pages: "text",
  odt: "text",
  key: "slides",
  ppt: "slides",
  pptx: "slides",
  odp: "slides",
  gpx: "route",
  kml: "route",
  kmz: "route",
  geojson: "route",
  fit: "route",
  json: "code",
  js: "code",
  ts: "code",
  tsx: "code",
  py: "code",
  html: "code",
  css: "code",
  yml: "code",
  yaml: "code",
  zip: "archive",
  gz: "archive",
  tar: "archive",
  "7z": "archive",
};

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function kindOf(file: AttachmentTrayItem): keyof typeof kinds {
  const type = (file.type ?? "").toLowerCase();
  if (type === "image" || type.startsWith("image/")) return "image";
  const byExt = extensions[extensionOf(file.name)];
  if (byExt) return byExt;
  if (type === "application/pdf") return "pdf";
  if (type.includes("spreadsheet") || type.includes("csv")) return "sheet";
  if (type.includes("presentation")) return "slides";
  if (type.startsWith("text/")) return "text";
  return "other";
}

function middleTruncate(name: string, width: number, measure: (text: string) => number) {
  if (measure(name) <= width) return name;
  const ext = extensionOf(name);
  for (let keep = Math.min(name.length - 1, ext ? ext.length + 5 : 6); keep >= 0; keep--) {
    const tail = name.slice(name.length - keep);
    let lo = 0;
    let hi = name.length - keep;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (measure(`${name.slice(0, mid).trimEnd()}…${tail}`) <= width) lo = mid;
      else hi = mid - 1;
    }
    if (lo > 0 || keep === 0) return `${name.slice(0, lo).trimEnd()}…${tail}`;
  }
  return name;
}

function MiddleTruncated({ text, className }: { text: string; className?: string }) {
  const node = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    let context: CanvasRenderingContext2D | null = null;
    let alive = true;
    const fit = () => {
      const width = el.clientWidth;
      if (!alive || !width) return;
      const style = getComputedStyle(el);
      context ??= document.createElement("canvas").getContext("2d");
      if (!context) return;
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const measure = (value: string) => context!.measureText(value).width;
      setShown(middleTruncate(text, width - 0.5, measure));
    };
    fit();
    document.fonts?.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [text]);

  return (
    <span ref={node} className={cn("block truncate whitespace-pre", className)}>
      {shown ?? text}
    </span>
  );
}

export interface AttachmentTileProps extends Omit<ComponentProps<"div">, "children"> {
  file: AttachmentTrayItem;
  onRemove?: () => void;
}

export function AttachmentTile({ file, onRemove, className, style, ...props }: AttachmentTileProps) {
  const kind = kindOf(file);
  const thumbnail = kind === "image" && file.src;
  const { icon: Icon, tint } = kinds[kind];
  const ext = extensionOf(file.name);

  return (
    <div
      title={file.name}
      {...props}
      style={{ ...(tint ? { "--miyuki-attachment-tray-tint": tint } : null), ...style } as CSSProperties}
      className={cn("group/tile relative shrink-0", className)}
    >
      {thumbnail ? (
        <div className="relative size-14 overflow-hidden rounded-lg bg-muted shadow-xs after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-1 after:ring-foreground/10 after:ring-inset">
          <img src={file.src} alt={file.name} draggable={false} className="size-full object-cover" />
        </div>
      ) : (
        <div className="flex h-14 w-44 items-center gap-2.5 rounded-lg border border-border bg-background ps-2 pe-3 shadow-xs dark:bg-muted/60">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-md [&_svg]:size-5",
              tint
                ? "bg-[color-mix(in_oklab,var(--miyuki-attachment-tray-tint)_15%,transparent)] text-[color-mix(in_oklab,var(--miyuki-attachment-tray-tint),var(--foreground)_28%)]"
                : "bg-muted text-muted-foreground dark:bg-accent",
            )}
          >
            <Icon strokeWidth={1.75} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <MiddleTruncated text={file.name} className="text-[13px] leading-[18px] font-medium text-foreground" />
            <span className="text-xs leading-4 text-muted-foreground">{ext ? ext.toUpperCase() : "File"}</span>
          </span>
        </div>
      )}
      {onRemove && (
        <CloseButton
          size="sm"
          aria-label={`Remove ${file.name}`}
          onPress={onRemove}
          className={cn(
            "absolute -end-1.5 -top-1.5 z-10 border border-border bg-popover shadow-xs",
            "data-[hovered]:bg-accent [&_svg]:size-2.5",
          )}
        />
      )}
    </div>
  );
}

export interface AttachmentTrayProps extends Omit<ComponentProps<"div">, "children"> {
  files: AttachmentTrayItem[];
  onRemove?: (id: string) => void;
}

export function AttachmentTray({ files, onRemove, className, ...props }: AttachmentTrayProps) {
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLUListElement>(null);
  const [previous, setPrevious] = useState(files);
  const [fresh, setFresh] = useState<string[]>(() => files.map((f) => f.id));
  const [edges, setEdges] = useState({ start: true, end: true });

  if (files !== previous) {
    const before = new Set(previous.map((f) => f.id));
    setFresh(files.filter((f) => !before.has(f.id)).map((f) => f.id));
    setPrevious(files);
  }

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = Math.abs(el.scrollLeft);
      const start = left <= 1;
      const end = left >= max - 1;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    el.addEventListener("scroll", measure, { passive: true });
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const rtl = getComputedStyle(el).direction === "rtl";
      const delta = rtl ? -event.deltaY : event.deltaY;
      const at = Math.abs(el.scrollLeft);
      if ((delta < 0 && at <= 0) || (delta > 0 && at >= max - 1)) return;
      event.preventDefault();
      el.scrollLeft += rtl ? -event.deltaY : event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", onWheel);
    };
  }, [files]);

  useEffect(() => {
    const el = scroller.current;
    const last = files.at(-1);
    if (!el || !last || !fresh.includes(last.id) || fresh.length === files.length) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollTo({ left: rtl ? -el.scrollWidth : el.scrollWidth, behavior: reduce ? "auto" : "smooth" });
  }, [fresh, files, reduce]);

  if (files.length === 0) return null;

  const fade = 28;
  const mask = `linear-gradient(to right, transparent, #000 ${edges.start ? 0 : fade}px, #000 calc(100% - ${edges.end ? 0 : fade}px), transparent)`;

  return (
    <div {...props} className={cn("min-w-0", className)}>
      <ul
        ref={scroller}
        aria-label="Attachments"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className={cn(
          "relative flex items-start gap-1.5 overflow-x-auto overscroll-x-contain px-3 pt-1.5 pb-0.5",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <AnimatePresence initial mode="popLayout">
          {files.map((file) => {
            const order = fresh.indexOf(file.id);
            const delay = order > 0 ? Math.min(order * STAGGER, STAGGER_CAP) : 0;
            return (
              <motion.li
                key={file.id}
                layout={reduce ? false : "position"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduce
                    ? { opacity: 0, transition: { duration: 0.12 } }
                    : { opacity: 0, scale: 0.6, transition: LEAVE }
                }
                transition={reduce ? { duration: 0.12, delay } : { ...SETTLE, delay }}
                className="shrink-0 pt-1.5 pe-1.5"
              >
                <AttachmentTile file={file} onRemove={onRemove ? () => onRemove(file.id) : undefined} />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

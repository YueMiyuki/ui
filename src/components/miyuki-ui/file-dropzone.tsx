"use client";

import { ArrowUp, File as FileGlyph, FileImage, FileText, Route } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useEffect, useId, useRef, useState } from "react";
import { Button, DropZone, type DropZoneProps, FileTrigger, isFileDropItem, Text } from "react-aria-components";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export interface FileDropzoneProps {
  onChange?: (files: File[]) => void;
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
  label?: ReactNode;
  hint?: ReactNode;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface Entry {
  id: string;
  file: File;
  order: number;
  error?: string;
}

type DropEvent = Parameters<NonNullable<DropZoneProps["onDrop"]>>[0];

const keyframes = `
@keyframes miyuki-file-dropzone-march { to { stroke-dashoffset: -22; } }
`;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 100 ? mb.toFixed(1).replace(/\.0$/, "") : Math.round(mb)} MB`;
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function matches(file: File, accept: string[]) {
  const ext = `.${extensionOf(file.name)}`;
  const type = file.type.toLowerCase();
  return accept.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith(".")) return ext === r;
    if (r.endsWith("/*")) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
}

function typeOf(file: File) {
  const ext = extensionOf(file.name);
  if (ext) return ext.toUpperCase();
  const sub = file.type.split("/")[1];
  return sub ? sub.toUpperCase() : "File";
}

function Glyph({ file }: { file: File }) {
  const ext = extensionOf(file.name);
  if (file.type.startsWith("image/")) return <FileImage strokeWidth={1.75} />;
  if (["gpx", "kml", "geojson", "fit"].includes(ext)) return <Route strokeWidth={1.75} />;
  if (file.type === "application/pdf" || file.type.startsWith("text/")) return <FileText strokeWidth={1.75} />;
  return <FileGlyph strokeWidth={1.75} />;
}

function MiddleName({ name }: { name: string }) {
  const dot = name.lastIndexOf(".");
  const tailLength = Math.min(name.length, (dot > 0 ? name.length - dot : 0) + 6);
  const head = name.slice(0, name.length - tailLength);
  const tail = name.slice(name.length - tailLength);
  return (
    <span title={name} className="flex min-w-0 text-sm leading-5 font-medium text-foreground">
      <span className="truncate">{head}</span>
      <span className="shrink-0 whitespace-pre">{tail}</span>
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Sheets() {
  const sheet =
    "absolute inset-0 rounded-[7px] ring-1 ring-inset transition-[transform,box-shadow,background-color] duration-300 ease-settle motion-reduce:transition-none";
  return (
    <span aria-hidden="true" className="relative block h-[70px] w-14">
      <span
        className={cn(
          sheet,
          "bg-secondary shadow-xs ring-border dark:bg-[color-mix(in_oklab,var(--card)_55%,var(--background))]",
          "origin-bottom -translate-x-[7px] translate-y-[3px] -rotate-[8deg]",
          "group-data-[hovered]/zone:-translate-x-[9px] group-data-[hovered]/zone:-rotate-[10deg]",
          "group-data-[drop-target]/zone:-translate-x-[26px] group-data-[drop-target]/zone:translate-y-[4px] group-data-[drop-target]/zone:-rotate-[19deg] group-data-[drop-target]/zone:ring-brand/40",
        )}
      />
      <span
        className={cn(
          sheet,
          "bg-secondary shadow-xs ring-border dark:bg-[color-mix(in_oklab,var(--card)_55%,var(--background))]",
          "origin-bottom translate-x-[7px] translate-y-[2px] rotate-[7deg]",
          "group-data-[hovered]/zone:translate-x-[9px] group-data-[hovered]/zone:rotate-[9deg]",
          "group-data-[drop-target]/zone:translate-x-[26px] group-data-[drop-target]/zone:translate-y-[4px] group-data-[drop-target]/zone:rotate-[18deg] group-data-[drop-target]/zone:ring-brand/40",
        )}
      />
      <span
        className={cn(
          sheet,
          "flex flex-col items-center bg-card pt-3.5 shadow-sm ring-border-strong",
          "group-data-[hovered]/zone:-translate-y-[5px] group-data-[hovered]/zone:shadow-md",
          "group-data-[drop-target]/zone:-translate-y-[9px] group-data-[drop-target]/zone:shadow-lg group-data-[drop-target]/zone:ring-brand/60",
        )}
      >
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full bg-brand-soft text-brand-strong",
            "transition-[background-color,color,transform] duration-300 ease-settle motion-reduce:transition-none",
            "group-data-[drop-target]/zone:bg-brand group-data-[drop-target]/zone:text-brand-foreground",
          )}
        >
          <ArrowUp className="size-3.5" strokeWidth={2.25} />
        </span>
        <span className="mt-2.5 h-[3px] w-7 rounded-full bg-muted-foreground/25" />
        <span className="mt-1.5 h-[3px] w-5 rounded-full bg-muted-foreground/15" />
      </span>
    </span>
  );
}

export function FileDropzone({
  onChange,
  accept,
  multiple = true,
  maxSize,
  label = "Drop files here",
  hint,
  isDisabled = false,
  className,
  ref,
}: FileDropzoneProps) {
  const reduce = useReducedMotion();
  const idPrefix = useId();
  const counter = useRef(0);
  const [entries, setEntries] = useState<Entry[]>([]);

  const reported = useRef(entries);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (reported.current === entries) return;
    reported.current = entries;
    onChangeRef.current?.(entries.filter((e) => !e.error).map((e) => e.file));
  }, [entries]);

  const add = (files: File[]) => {
    if (isDisabled || files.length === 0) return;
    const chosen = multiple ? files : files.slice(0, 1);
    const next = chosen.map((file, order): Entry => {
      counter.current += 1;
      const id = `${idPrefix}-${counter.current}`;
      let error: string | undefined;
      if (accept && accept.length > 0 && !matches(file, accept)) error = "This type is not accepted";
      else if (maxSize != null && file.size > maxSize) error = `Larger than ${formatSize(maxSize)}`;
      return { id, file, order, error };
    });
    setEntries((list) => (multiple ? [...list, ...next] : next));
  };

  const onDrop = async (event: DropEvent) => {
    const files = await Promise.all(event.items.filter(isFileDropItem).map((item) => item.getFile()));
    add(files);
  };

  const limit = maxSize != null ? `Up to ${formatSize(maxSize)}${multiple ? " each" : ""}.` : null;

  return (
    <div ref={ref} className={cn("flex w-full flex-col gap-3", isDisabled && "opacity-50", className)}>
      <style href="miyuki-file-dropzone" precedence="miyuki">
        {keyframes}
      </style>
      <DropZone
        isDisabled={isDisabled}
        onDrop={onDrop}
        getDropOperation={() => (isDisabled ? "cancel" : "copy")}
        className={({ isFocusVisible }) =>
          cn(
            "group/zone relative isolate flex min-h-56 flex-col items-center justify-center rounded-2xl px-6 py-9 text-center outline-none",
            "transition-[background-color,box-shadow] duration-200 ease-settle",
            "bg-muted/35 data-[hovered]:bg-muted/60 data-[drop-target]:bg-brand-soft/60 dark:data-[drop-target]:bg-brand-soft/45",
            "[--miyuki-file-dropzone-grid:var(--border)] data-[drop-target]:[--miyuki-file-dropzone-grid:color-mix(in_oklab,var(--brand)_28%,transparent)]",
            isFocusVisible && "ring-[3px] ring-ring",
          )
        }
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-70 transition-opacity duration-300",
            "[mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_72%)]",
            "group-data-[drop-target]/zone:opacity-100",
          )}
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--miyuki-file-dropzone-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--miyuki-file-dropzone-grid) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            backgroundPosition: "center center",
          }}
        />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <rect
            x="0.5"
            y="0.5"
            rx="17.5"
            className={cn(
              "fill-none stroke-border-strong transition-[stroke] duration-200",
              "group-data-[hovered]/zone:stroke-[color-mix(in_oklab,var(--border-strong)_60%,var(--muted-foreground))]",
              "group-data-[drop-target]/zone:stroke-brand group-data-[drop-target]/zone:animate-[miyuki-file-dropzone-march_0.7s_linear_infinite]",
              "motion-reduce:animate-none!",
            )}
            style={{ width: "calc(100% - 1px)", height: "calc(100% - 1px)" }}
            strokeWidth={1}
            strokeDasharray="7 4"
          />
        </svg>
        <FileTrigger
          acceptedFileTypes={accept}
          allowsMultiple={multiple}
          onSelect={(list) => add(list ? Array.from(list) : [])}
        >
          <Button
            isDisabled={isDisabled}
            aria-label="Choose files"
            className="absolute inset-0 cursor-default rounded-[inherit] outline-none data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring"
          />
        </FileTrigger>
        <span className="pointer-events-none relative flex flex-col items-center">
          <Sheets />
          <Text slot="label" className="mt-6 text-sm font-medium text-foreground">
            {label}
          </Text>
          <span className="mt-1 text-[13px] text-muted-foreground">
            {hint ?? (
              <>
                or <span className="font-medium text-brand-strong">choose files</span>
                {limit ? `. ${limit}` : ""}
              </>
            )}
          </span>
        </span>
      </DropZone>

      {entries.length > 0 && (
        <ul aria-label="Chosen files" className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {entries.map((entry) => {
              const failed = entry.error != null;
              return (
                <motion.li
                  key={entry.id}
                  layout={reduce ? false : "position"}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: "easeOut" } }}
                  transition={
                    reduce
                      ? { duration: 0.12 }
                      : { type: "spring", stiffness: 420, damping: 34, delay: Math.min(entry.order * 0.045, 0.27) }
                  }
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card py-2.5 ps-2.5 pe-2 shadow-xs",
                    failed ? "border-destructive/35" : "border-border",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-md [&_svg]:size-[18px]",
                      failed ? "bg-destructive-soft text-destructive-strong" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Glyph file={entry.file} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <MiddleName name={entry.file.name} />
                    <span className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground tabular-nums">
                      <span className="shrink-0">{typeOf(entry.file)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="shrink-0">{formatSize(entry.file.size)}</span>
                      <span aria-hidden="true">·</span>
                      {failed ? (
                        <span className="truncate text-destructive">{entry.error}</span>
                      ) : (
                        <span className="truncate">
                          <span className="sr-only">Modified </span>
                          {dateFormat.format(entry.file.lastModified)}
                        </span>
                      )}
                    </span>
                  </span>
                  <CloseButton
                    size="lg"
                    aria-label={`Remove ${entry.file.name}`}
                    onPress={() => setEntries((list) => list.filter((e) => e.id !== entry.id))}
                  />
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

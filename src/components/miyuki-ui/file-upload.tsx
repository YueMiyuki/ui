"use client";

import { CircleAlert, CircleCheck, File, FileImage, FileText, RotateCw, Route, Upload } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useEffect, useId, useRef, useState } from "react";
import { DropZone, type DropZoneProps, FileTrigger, isFileDropItem } from "react-aria-components";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { LinkButton } from "@/components/miyuki-ui/link-button";
import { cn } from "@/lib/utils";

export type FileUploadStatus = "uploading" | "done" | "failed";

export interface FileUploadItem {
  id: string;
  name: string;
  size: number;
  type?: string;
  status: FileUploadStatus;
  progress: number;
  error?: string;
  rejected?: boolean;
  file?: globalThis.File;
}

export type FileUploadFn = (
  file: globalThis.File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
) => Promise<void>;

export interface FileUploadProps {
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
  upload?: FileUploadFn;
  onChange?: (items: FileUploadItem[]) => void;
  defaultItems?: FileUploadItem[];
  hint?: ReactNode;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 100 ? mb.toFixed(1).replace(/\.0$/, "") : Math.round(mb)} MB`;
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function matches(file: { name: string; type?: string }, accept: string[]) {
  const ext = `.${extensionOf(file.name)}`;
  const type = (file.type ?? "").toLowerCase();
  return accept.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith(".")) return ext === r;
    if (r.endsWith("/*")) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
}

const typeNames: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "image/*": "images",
  "text/plain": "TXT",
  "text/csv": "CSV",
  ".jpeg": "JPG",
};

function typeLabel(rule: string) {
  const r = rule.trim().toLowerCase();
  return typeNames[r] ?? (r.startsWith(".") ? r.slice(1).toUpperCase() : r.split("/").pop()!.toUpperCase());
}

function listWithOr(parts: string[]) {
  const unique = Array.from(new Set(parts));
  return unique.length < 2 ? (unique[0] ?? "") : `${unique.slice(0, -1).join(", ")} or ${unique.at(-1)}`;
}

type DropEvent = Parameters<NonNullable<DropZoneProps["onDrop"]>>[0];

function FileIcon({ name, type = "" }: { name: string; type?: string }) {
  const ext = extensionOf(name);
  if (type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "heic", "svg"].includes(ext))
    return <FileImage strokeWidth={1.75} />;
  if (ext === "gpx" || ext === "kml" || ext === "geojson") return <Route strokeWidth={1.75} />;
  if (type === "application/pdf" || ["pdf", "txt", "md", "doc", "docx"].includes(ext))
    return <FileText strokeWidth={1.75} />;
  return <File strokeWidth={1.75} />;
}

const simulateUpload: FileUploadFn = (file, onProgress, signal) =>
  new Promise((resolve, reject) => {
    const duration = Math.min(3200, Math.max(1100, 700 + (file.size / (1024 * 1024)) * 320));
    const started = performance.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / duration);
      onProgress(1 - (1 - t) ** 2.2);
      if (t >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 90);
    signal.addEventListener("abort", () => {
      clearInterval(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    });
  });

function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex w-full items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-brand transition-transform duration-300 ease-out motion-reduce:transition-none",
            "after:absolute after:inset-y-0 after:end-0 after:w-5 after:rounded-full after:bg-linear-to-r after:from-transparent after:to-white/45",
          )}
          style={{ transform: `translateX(${percent - 100}%)` }}
        />
      </div>
      <span className="w-8 shrink-0 text-end text-xs text-muted-foreground tabular-nums">{percent}%</span>
    </div>
  );
}

const quietIcon = "rounded-full text-muted-foreground data-[hovered]:text-foreground";

interface RowProps {
  item: FileUploadItem;
  accept?: string[];
  onRemove: () => void;
  onRetry: () => void;
  onReplace: (file: globalThis.File) => void;
}

function Row({ item, accept, onRemove, onRetry, onReplace }: RowProps) {
  const failed = item.status === "failed";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card py-2.5 ps-2.5 pe-2 shadow-xs",
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
        <FileIcon name={item.name} type={item.type} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm leading-5 font-medium text-foreground">{item.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatFileSize(item.size)}</span>
        </div>
        <div className="flex h-4 items-center text-xs leading-4">
          {item.status === "uploading" && <ProgressBar value={item.progress} label={`Uploading ${item.name}`} />}
          {item.status === "done" && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CircleCheck aria-hidden="true" className="size-3.5 text-success" strokeWidth={2.25} />
              Uploaded
            </span>
          )}
          {failed && (
            <span className="flex min-w-0 items-center gap-1.5 text-destructive">
              <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{item.error ?? "Upload failed"}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {failed &&
          (item.rejected ? (
            <FileTrigger
              acceptedFileTypes={accept}
              onSelect={(files) => {
                const next = files?.[0];
                if (next) onReplace(next);
              }}
            >
              <IconButton
                variant="ghost"
                size="sm"
                className={quietIcon}
                aria-label={`Choose a file to replace ${item.name}`}
              >
                <RotateCw />
              </IconButton>
            </FileTrigger>
          ) : (
            <IconButton
              variant="ghost"
              size="sm"
              className={quietIcon}
              aria-label={`Try ${item.name} again`}
              onPress={onRetry}
            >
              <RotateCw />
            </IconButton>
          ))}
        <CloseButton
          size="lg"
          aria-label={item.status === "uploading" ? `Cancel ${item.name}` : `Remove ${item.name}`}
          onPress={onRemove}
        />
      </div>
    </div>
  );
}

export function FileUpload({
  accept,
  maxSize,
  multiple = true,
  upload,
  onChange,
  defaultItems = [],
  hint,
  isDisabled = false,
  className,
  ref,
}: FileUploadProps) {
  const reduce = useReducedMotion();
  const idPrefix = useId();
  const counter = useRef(0);
  const controllers = useRef(new Map<string, AbortController>());
  const [items, setItems] = useState<FileUploadItem[]>(defaultItems);

  const reported = useRef(items);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (reported.current === items) return;
    reported.current = items;
    onChangeRef.current?.(items);
  }, [items]);

  useEffect(() => {
    const running = controllers.current;
    return () => running.forEach((c) => c.abort());
  }, []);

  const patch = (id: string, change: Partial<FileUploadItem>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...change } : it)));

  const start = (id: string, file: globalThis.File) => {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    (upload ?? simulateUpload)(
      file,
      (fraction) => patch(id, { progress: Math.max(0, Math.min(1, fraction)) }),
      controller.signal,
    )
      .then(() => {
        if (!controller.signal.aborted) patch(id, { status: "done", progress: 1 });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error && error.message ? error.message : "Upload failed";
        patch(id, { status: "failed", error: message, rejected: false });
      })
      .finally(() => controllers.current.delete(id));
  };

  const toItem = (file: globalThis.File): FileUploadItem => {
    counter.current += 1;
    const id = `${idPrefix}-${counter.current}`;
    const base = { id, name: file.name, size: file.size, type: file.type, progress: 0, file };
    if (accept && accept.length > 0 && !matches(file, accept)) {
      const ext = extensionOf(file.name);
      return {
        ...base,
        status: "failed",
        rejected: true,
        error: `${ext ? ext.toUpperCase() : "These"} files are not accepted`,
      };
    }
    if (maxSize != null && file.size > maxSize) {
      return { ...base, status: "failed", rejected: true, error: `Larger than ${formatFileSize(maxSize)}` };
    }
    return { ...base, status: "uploading" };
  };

  const add = (files: globalThis.File[]) => {
    if (isDisabled || files.length === 0) return;
    const chosen = multiple ? files : files.slice(0, 1);
    const next = chosen.map(toItem);
    setItems((list) => (multiple ? [...list, ...next] : next));
    next.forEach((it) => it.status === "uploading" && it.file && start(it.id, it.file));
  };

  const remove = (id: string) => {
    controllers.current.get(id)?.abort();
    setItems((list) => list.filter((it) => it.id !== id));
  };

  const retry = (item: FileUploadItem) => {
    if (!item.file) return;
    patch(item.id, { status: "uploading", progress: 0, error: undefined });
    start(item.id, item.file);
  };

  const replace = (id: string, file: globalThis.File) => {
    const next = toItem(file);
    setItems((list) => list.map((it) => (it.id === id ? next : it)));
    if (next.status === "uploading") start(next.id, file);
  };

  const onDrop = async (event: DropEvent) => {
    const files = await Promise.all(event.items.filter(isFileDropItem).map((item) => item.getFile()));
    add(files);
  };

  const limits = [
    accept && accept.length > 0 ? listWithOr(accept.map(typeLabel)) : null,
    maxSize != null ? `up to ${formatFileSize(maxSize)}${multiple ? " each" : ""}` : null,
  ].filter(Boolean);

  return (
    <div ref={ref} className={cn("flex w-full flex-col gap-3", isDisabled && "opacity-50", className)}>
      <DropZone
        isDisabled={isDisabled}
        onDrop={onDrop}
        getDropOperation={() => (isDisabled ? "cancel" : "copy")}
        className={({ isDropTarget, isFocusVisible }) =>
          cn(
            "group/drop flex flex-col items-center rounded-xl border border-dashed p-8 text-center outline-none",
            "transition-[border-color,background-color,box-shadow] duration-200 ease-settle",
            isDropTarget ? "border-brand bg-brand-soft/60" : "border-border-strong bg-muted/40",
            isFocusVisible && "ring-[3px] ring-ring",
          )
        }
      >
        {({ isDropTarget }) => (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "grid size-11 place-items-center rounded-full shadow-xs ring-1 ring-inset",
                "transition-[background-color,color,translate,box-shadow] duration-200 ease-settle motion-reduce:transition-none",
                isDropTarget
                  ? "-translate-y-0.5 bg-brand text-brand-foreground ring-transparent"
                  : "bg-card text-muted-foreground ring-border",
              )}
            >
              <Upload className="size-5" strokeWidth={1.75} />
            </span>
            <p className="mt-3.5 text-sm text-foreground">
              Drag and drop to upload or{" "}
              <FileTrigger
                acceptedFileTypes={accept}
                allowsMultiple={multiple}
                onSelect={(list) => add(list ? Array.from(list) : [])}
              >
                <LinkButton isDisabled={isDisabled}>choose files</LinkButton>
              </FileTrigger>
            </p>
            {(hint != null || limits.length > 0) && (
              <p className="mt-1 text-[13px] text-muted-foreground">{hint ?? limits.join(", ")}</p>
            )}
          </>
        )}
      </DropZone>

      {items.length > 0 && (
        <ul aria-label="Files" className="relative flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout={reduce ? false : "position"}
                initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
                transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
              >
                <Row
                  item={item}
                  accept={accept}
                  onRemove={() => remove(item.id)}
                  onRetry={() => retry(item)}
                  onReplace={(file) => replace(item.id, file)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

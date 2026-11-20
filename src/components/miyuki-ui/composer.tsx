"use client";

import { ArrowUp, AtSign, Bold, File, FileImage, FileText, Italic, Link, Paperclip } from "lucide-react";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Popover as AriaPopover, FileTrigger } from "react-aria-components";
import { flushSync } from "react-dom";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

export type ComposerTool = "attach" | "bold" | "italic" | "link" | "mention";

export interface ComposerFile {
  id: string;
  name: string;
  size: number;
  type?: string;
  src?: string;
  file?: File;
}

export interface ComposerMention {
  id: string;
  name: string;
  avatar?: string;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const LEAVE: Transition = { duration: 0.12, ease: [0.4, 0, 1, 1] };
const FADE: Transition = { duration: 0.12, ease: "easeOut" };
const GLIDE = "cubic-bezier(0.22, 1, 0.36, 1)";

const keyframes = `
@keyframes miyuki-composer-in {
  from { opacity: 0; transform: translateY(calc(var(--miyuki-composer-dir, 1) * 4px)) scale(0.96); }
}
@keyframes miyuki-composer-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes miyuki-composer-fade-in { from { opacity: 0; } }
@keyframes miyuki-composer-fade-out { to { opacity: 0; } }
`;

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function accepts(file: File, accept?: string[]) {
  if (!accept?.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith(".")) return name.endsWith(r);
    if (r.endsWith("/*")) return type.startsWith(r.slice(0, -1));
    return type === r;
  });
}

function findMention(text: string, caret: number) {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (query.length > 32 || !/^[\p{L}\p{M}\p{N}'’.-]*$/u.test(query)) return null;
  return { start: at, query };
}

function insertText(el: HTMLTextAreaElement, text: string, start: number, end: number) {
  el.focus();
  el.setSelectionRange(start, end);
  let done = false;
  try {
    done = document.execCommand("insertText", false, text);
  } catch {
    done = false;
  }
  if (!done) {
    el.setRangeText(text, start, end, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function Counter({ count, max }: { count: number; max: number }) {
  const tone = count >= max ? "limit" : count / max >= 0.9 ? "near" : "calm";
  const left = Math.max(0, max - count);
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "rounded-full px-1.5 py-px text-xs leading-4 tabular-nums transition-colors duration-150 ease-settle",
          tone === "calm" && "text-muted-foreground",
          tone === "near" && "bg-warning-soft text-warning-strong",
          tone === "limit" && "bg-destructive-soft text-destructive-strong",
        )}
      >
        {count}/{max}
      </span>
      <span className="sr-only" aria-live="polite">
        {tone === "calm" ? "" : `${left} ${left === 1 ? "character" : "characters"} left`}
      </span>
    </>
  );
}

function FileChip({ file, onRemove, isDisabled }: { file: ComposerFile; onRemove: () => void; isDisabled: boolean }) {
  const [broken, setBroken] = useState<string | null>(null);
  const image = (file.type ?? "").startsWith("image/");
  const text = (file.type ?? "").startsWith("text/") || file.type === "application/pdf";
  const Icon = image ? FileImage : text ? FileText : File;
  const dot = file.name.lastIndexOf(".");
  const base = dot > 0 ? file.name.slice(0, dot) : file.name;
  const ext = dot > 0 ? file.name.slice(dot) : "";
  return (
    <div
      title={file.name}
      className="flex h-11 max-w-60 min-w-0 items-center gap-2.5 rounded-lg border border-border bg-background ps-1.5 pe-1.5 dark:bg-muted/60"
    >
      {image && file.src && broken !== file.src ? (
        <img
          src={file.src}
          alt=""
          draggable={false}
          onError={() => setBroken(file.src ?? null)}
          className="size-8 shrink-0 rounded-md object-cover ring-1 ring-foreground/10 ring-inset"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-strong [&_svg]:size-4"
        >
          <Icon strokeWidth={1.75} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 text-[13px] leading-[18px] font-medium text-foreground">
          <span className="truncate">{base}</span>
          <span className="shrink-0">{ext}</span>
        </span>
        <span className="text-xs leading-4 text-muted-foreground tabular-nums">{formatSize(file.size)}</span>
      </span>
      <CloseButton size="sm" aria-label={`Remove ${file.name}`} onPress={onRemove} isDisabled={isDisabled} />
    </div>
  );
}

function ToolButton({
  label,
  shortcut,
  onPress,
  isDisabled,
  children,
}: {
  label: string;
  shortcut?: string;
  onPress?: () => void;
  isDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <TooltipTrigger delay={600}>
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={label}
        onPress={onPress}
        isDisabled={isDisabled}
        className="size-7 rounded-md text-muted-foreground data-[hovered]:text-foreground"
      >
        {children}
      </IconButton>
      <Tooltip shortcut={shortcut}>{label}</Tooltip>
    </TooltipTrigger>
  );
}

export interface ComposerProps
  extends Omit<ComponentProps<"div">, "onChange" | "onSubmit" | "defaultValue" | "children" | "placeholder"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  files?: ComposerFile[];
  defaultFiles?: ComposerFile[];
  onFilesChange?: (files: ComposerFile[]) => void;
  placeholder?: string;
  onSubmit?: (value: string, files: ComposerFile[]) => unknown;
  submitOn?: "enter" | "mod-enter";
  isPending?: boolean;
  isDisabled?: boolean;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  tools?: ComposerTool[];
  mentions?: ComposerMention[];
  accept?: string[];
  maxFiles?: number;
  "aria-label"?: string;
}

export function Composer({
  value,
  defaultValue = "",
  onChange,
  files,
  defaultFiles,
  onFilesChange,
  placeholder = "Write a message…",
  onSubmit,
  submitOn = "enter",
  isPending,
  isDisabled = false,
  maxLength,
  minRows = 1,
  maxRows = 8,
  tools = ["attach", "bold", "italic", "link", "mention"],
  mentions,
  accept,
  maxFiles,
  "aria-label": ariaLabel = "Message",
  className,
  ...props
}: ComposerProps) {
  const reduce = useReducedMotion();
  const id = useId();
  const listId = `${id}-people`;
  const surface = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLUListElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const alive = useRef(true);
  const made = useRef(new Set<string>());
  const counter = useRef(0);
  const depth = useRef(0);

  const [ownText, setOwnText] = useState(defaultValue);
  const text = value ?? ownText;
  const textRef = useRef(text);
  textRef.current = text;

  const [ownFiles, setOwnFiles] = useState<ComposerFile[]>(defaultFiles ?? []);
  const list = files ?? ownFiles;
  const listRef = useRef(list);
  listRef.current = list;

  const [busy, setBusy] = useState(false);
  const pending = isPending ?? busy;
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [apple, setApple] = useState(true);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [active, setActive] = useState(0);

  const has = (tool: ComposerTool) => tools.includes(tool);
  const canMention = has("mention") && (mentions?.length ?? 0) > 0;
  const roomForFiles = maxFiles == null || list.length < maxFiles;
  const canAttach = has("attach") && !isDisabled && roomForFiles;
  const canSend = !isDisabled && (text.trim() !== "" || list.length > 0);
  const mod = apple ? "⌘" : "Ctrl+";

  useEffect(() => {
    const platform = navigator.platform || navigator.userAgent;
    setApple(/Mac|iPhone|iPad|iPod/i.test(platform));
    setReady(true);
    alive.current = true;
    const urls = made.current;
    return () => {
      alive.current = false;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const setText = useCallback(
    (next: string) => {
      if (value === undefined) setOwnText(next);
      onChange?.(next);
    },
    [value, onChange],
  );

  const setFiles = useCallback(
    (next: ComposerFile[]) => {
      listRef.current = next;
      if (files === undefined) setOwnFiles(next);
      onFilesChange?.(next);
    },
    [files, onFilesChange],
  );

  const fit = useCallback(() => {
    const el = area.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const line = parseFloat(style.lineHeight) || 24;
    const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const min = minRows * line + chrome;
    const max = maxRows * line + chrome;
    el.style.height = "0px";
    const content = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(content, min), max)}px`;
    el.style.overflowY = content > max + 1 ? "auto" : "hidden";
  }, [minRows, maxRows]);

  useLayoutEffect(fit, [fit, text]);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  const people = useMemo(() => {
    if (!canMention || !mention || mention.start === dismissed) return [];
    const q = fold(mention.query);
    const all = mentions ?? [];
    if (!q) return all;
    const words = all.filter((p) =>
      fold(p.name)
        .split(/\s+/)
        .some((w) => w.startsWith(q)),
    );
    const rest = all.filter((p) => !words.includes(p) && fold(p.name).includes(q));
    return [...words, ...rest];
  }, [canMention, mention, dismissed, mentions]);

  const listOpen = people.length > 0;
  const activeIndex = listOpen ? Math.min(active, people.length - 1) : -1;

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  function track(el: HTMLTextAreaElement) {
    const found = el.selectionStart === el.selectionEnd ? findMention(el.value, el.selectionStart) : null;
    if (!found) {
      if (mention) setMention(null);
      if (dismissed != null) setDismissed(null);
      return;
    }
    if (mention?.start === found.start && mention.query === found.query) return;
    setMention(found);
    setActive(0);
    if (found.start !== dismissed) setDismissed(null);
  }

  function format(kind: "bold" | "italic" | "link") {
    const el = area.current;
    if (!el || isDisabled) return;
    const { selectionStart: s, selectionEnd: e, value: all } = el;
    const picked = all.slice(s, e);
    if (kind === "link") {
      insertText(el, `[${picked}](url)`, s, e);
      const at = s + picked.length + 3;
      el.setSelectionRange(at, at + 3);
      return;
    }
    const mark = kind === "bold" ? "**" : "_";
    const n = mark.length;
    if (picked.length >= n * 2 && picked.startsWith(mark) && picked.endsWith(mark)) {
      const inner = picked.slice(n, -n);
      insertText(el, inner, s, e);
      el.setSelectionRange(s, s + inner.length);
      return;
    }
    if (all.slice(s - n, s) === mark && all.slice(e, e + n) === mark) {
      insertText(el, picked, s - n, e + n);
      el.setSelectionRange(s - n, e - n);
      return;
    }
    insertText(el, mark + picked + mark, s, e);
    el.setSelectionRange(s + n, e + n);
  }

  function startMention() {
    const el = area.current;
    if (!el || isDisabled) return;
    const at = el.selectionEnd;
    const before = el.value.slice(0, at);
    const pad = before !== "" && !/\s$/.test(before) ? " " : "";
    setDismissed(null);
    insertText(el, `${pad}@`, at, at);
    track(el);
  }

  function pick(person: ComposerMention | undefined) {
    const el = area.current;
    if (!el || !person || !mention) return;
    const end = mention.start + 1 + mention.query.length;
    insertText(el, `@${person.name} `, mention.start, end);
    setMention(null);
  }

  function addFiles(incoming: File[]) {
    if (!canAttach) return;
    const room = maxFiles == null ? Infinity : Math.max(0, maxFiles - listRef.current.length);
    const fresh = incoming
      .filter((f) => accepts(f, accept))
      .slice(0, room)
      .map((f): ComposerFile => {
        counter.current += 1;
        const src = f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
        if (src) made.current.add(src);
        return {
          id: `${Date.now().toString(36)}-${counter.current}`,
          name: f.name,
          size: f.size,
          type: f.type,
          src,
          file: f,
        };
      });
    if (fresh.length) settleTray(() => setFiles([...listRef.current, ...fresh]));
  }

  function chipSpots() {
    const spots = new Map<string, { x: number; y: number }>();
    const ul = tray.current;
    if (!ul) return spots;
    const base = ul.getBoundingClientRect();
    for (const li of ul.querySelectorAll<HTMLElement>(":scope > li[data-id]")) {
      const r = li.getBoundingClientRect();
      spots.set(li.dataset.id ?? "", { x: r.left - base.left, y: r.top - base.top });
    }
    return spots;
  }

  function settleTray(change: () => void) {
    const ul = tray.current;
    if (reduce || !ul) {
      flushSync(change);
      return;
    }
    const before = chipSpots();
    const height = ul.offsetHeight;
    flushSync(change);
    if (!tray.current || tray.current !== ul) return;
    const after = chipSpots();
    for (const li of ul.querySelectorAll<HTMLElement>(":scope > li[data-id]")) {
      const id = li.dataset.id ?? "";
      const was = before.get(id);
      const now = after.get(id);
      if (!was || !now) continue;
      const dx = was.x - now.x;
      const dy = was.y - now.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      li.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 260, easing: GLIDE });
    }
    const next = ul.offsetHeight;
    if (Math.abs(next - height) > 0.5)
      ul.animate([{ height: `${height}px` }, { height: `${next}px` }], { duration: 260, easing: GLIDE });
  }

  function removeFile(file: ComposerFile) {
    if (leaving.includes(file.id)) return;
    area.current?.focus();
    setLeaving((ids) => [...ids, file.id]);
    window.setTimeout(
      () => {
        if (!alive.current) return;
        if (file.src && made.current.has(file.src)) {
          URL.revokeObjectURL(file.src);
          made.current.delete(file.src);
        }
        settleTray(() => {
          setFiles(listRef.current.filter((f) => f.id !== file.id));
          setLeaving((ids) => ids.filter((id) => id !== file.id));
        });
      },
      reduce ? 100 : 120,
    );
  }

  async function send() {
    if (!canSend || pending) return;
    const sentText = text;
    const sentFiles = list;
    setMention(null);
    let result: unknown;
    try {
      result = onSubmit?.(sentText, sentFiles);
    } catch {
      return;
    }
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setBusy(true);
      try {
        await result;
      } catch {
        if (alive.current) setBusy(false);
        return;
      }
      if (!alive.current) return;
      setBusy(false);
    }
    if (textRef.current === sentText) setText("");
    setFiles(listRef.current.filter((f) => !sentFiles.includes(f)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const modKey = event.metaKey || event.ctrlKey;

    if (listOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((activeIndex + step + people.length) % people.length);
        return;
      }
      if ((event.key === "Enter" || event.key === "Tab") && !modKey && !event.shiftKey) {
        event.preventDefault();
        pick(people[activeIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setDismissed(mention?.start ?? null);
        return;
      }
    }

    if (modKey && !event.altKey && !event.shiftKey) {
      const key = event.key.toLowerCase();
      if (key === "b" && has("bold")) {
        event.preventDefault();
        format("bold");
        return;
      }
      if (key === "i" && has("italic")) {
        event.preventDefault();
        format("italic");
        return;
      }
      if (key === "k" && has("link")) {
        event.preventDefault();
        format("link");
        return;
      }
    }

    if (event.key !== "Enter" || event.altKey) return;
    const wantsSend = submitOn === "enter" ? !event.shiftKey && !modKey : modKey;
    if (!wantsSend) return;
    event.preventDefault();
    send();
  }

  function onSurfaceMouseDown(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, [role=button], img")) return;
    event.preventDefault();
    area.current?.focus();
  }

  function carriesFiles(event: DragEvent<HTMLDivElement>) {
    return canAttach && Array.from(event.dataTransfer?.types ?? []).includes("Files");
  }

  return (
    <div
      {...props}
      ref={surface}
      onMouseDown={onSurfaceMouseDown}
      onDragEnter={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        if (!dragging) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        if (!dragging) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
      }}
      data-disabled={isDisabled || undefined}
      className={cn(
        "relative flex w-full cursor-text flex-col rounded-xl border bg-card text-foreground shadow-xs",
        "transition-[border-color,box-shadow] duration-150 ease-settle",
        dragging
          ? "border-brand"
          : "border-input hover:border-border-strong focus-within:border-brand focus-within:ring-[3px] focus-within:ring-ring focus-within:hover:border-brand",
        isDisabled && "pointer-events-none cursor-not-allowed opacity-50",
        className,
      )}
    >
      <style href="miyuki-composer" precedence="miyuki">
        {keyframes}
      </style>
      <AnimatePresence initial={false}>
        {list.length > 0 && (
          <motion.ul
            key="files"
            ref={tray}
            aria-label="Attachments"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0, transition: FADE } : { opacity: 0, height: 0, transition: LEAVE }}
            transition={reduce ? FADE : SETTLE}
            className="flex flex-wrap gap-2 overflow-clip px-2.5 pt-2.5"
          >
            {list.map((file) => {
              const going = leaving.includes(file.id);
              return (
                <motion.li
                  key={file.id}
                  data-id={file.id}
                  initial={ready ? (reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }) : false}
                  animate={going ? (reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }) : { opacity: 1, scale: 1 }}
                  transition={going ? LEAVE : reduce ? FADE : SETTLE}
                  className={cn("flex min-w-0", going && "pointer-events-none")}
                >
                  <FileChip file={file} isDisabled={isDisabled} onRemove={() => removeFile(file)} />
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
      <textarea
        ref={area}
        value={text}
        rows={minRows}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-busy={pending || undefined}
        aria-autocomplete={canMention ? "list" : undefined}
        aria-controls={listOpen ? listId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        onChange={(event) => {
          setText(event.target.value);
          track(event.target);
        }}
        onSelect={(event) => track(event.currentTarget)}
        onKeyDown={onKeyDown}
        onBlur={() => setMention(null)}
        className={cn(
          "block w-full resize-none overflow-y-hidden bg-transparent px-3.5 pt-3 pb-1.5 text-sm leading-6 text-foreground outline-none",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed [overflow-wrap:anywhere] [scrollbar-width:thin]",
        )}
      />
      <div className="flex items-center gap-1 px-2 pb-2">
        <div className="flex min-w-0 items-center gap-0.5">
          {has("attach") && (
            <FileTrigger
              allowsMultiple={maxFiles == null || maxFiles - list.length > 1}
              acceptedFileTypes={accept}
              onSelect={(picked) => {
                if (picked) addFiles(Array.from(picked));
              }}
            >
              <ToolButton label="Attach files" isDisabled={!canAttach}>
                <Paperclip strokeWidth={1.75} />
              </ToolButton>
            </FileTrigger>
          )}
          {has("attach") && (has("bold") || has("italic") || has("link") || canMention) && (
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          )}
          {has("bold") && (
            <ToolButton label="Bold" shortcut={`${mod}B`} onPress={() => format("bold")} isDisabled={isDisabled}>
              <Bold strokeWidth={2} />
            </ToolButton>
          )}
          {has("italic") && (
            <ToolButton label="Italic" shortcut={`${mod}I`} onPress={() => format("italic")} isDisabled={isDisabled}>
              <Italic strokeWidth={1.75} />
            </ToolButton>
          )}
          {has("link") && (
            <ToolButton label="Link" shortcut={`${mod}K`} onPress={() => format("link")} isDisabled={isDisabled}>
              <Link strokeWidth={1.75} />
            </ToolButton>
          )}
          {canMention && (
            <ToolButton label="Mention someone" shortcut="@" onPress={startMention} isDisabled={isDisabled}>
              <AtSign strokeWidth={1.75} />
            </ToolButton>
          )}
        </div>
        <span className="flex-1" />
        <span
          aria-hidden="true"
          className="hidden text-xs whitespace-nowrap text-muted-foreground select-none sm:inline"
        >
          {submitOn === "enter" ? "↵ to send" : `${apple ? "⌘" : "Ctrl"} ↵ to send`}
        </span>
        {maxLength != null && <Counter count={text.length} max={maxLength} />}
        <IconButton
          variant="primary"
          size="sm"
          aria-label="Send"
          isPending={pending}
          isDisabled={!canSend}
          onPress={() => send()}
          className="ms-1 size-8 rounded-lg"
        >
          <ArrowUp strokeWidth={2.25} />
        </IconButton>
      </div>
      {dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-brand-soft animate-[miyuki-composer-fade-in_120ms_ease-out]"
        >
          <span className="absolute inset-1.5 rounded-lg border-[1.5px] border-dashed border-brand" />
          <span className="flex items-center gap-2 text-sm font-medium text-brand-strong">
            <Paperclip aria-hidden="true" className="size-4" strokeWidth={1.75} />
            Drop to attach
          </span>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {listOpen ? `${people.length} ${people.length === 1 ? "person" : "people"} found` : ""}
      </span>
      {canMention && (
        <AriaPopover
          triggerRef={surface}
          isOpen={listOpen}
          onOpenChange={(next) => {
            if (!next) setMention(null);
          }}
          isNonModal
          placement="top start"
          offset={6}
          className={cn(
            "flex w-64 max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
            "[--miyuki-composer-ox:min(calc(var(--trigger-width)/2),100%)] [&[dir=rtl]]:[--miyuki-composer-ox:calc(100%_-_min(calc(var(--trigger-width)/2),100%))]",
            "origin-[var(--miyuki-composer-ox)_var(--miyuki-composer-oy,100%)] data-[placement=bottom]:[--miyuki-composer-oy:0px]",
            "data-[placement=bottom]:[--miyuki-composer-dir:-1]",
            "data-[entering]:animate-[miyuki-composer-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-composer-out_120ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-composer-fade-in_120ms_ease-out]",
            "motion-reduce:data-[exiting]:animate-[miyuki-composer-fade-out_100ms_ease-in_forwards]",
          )}
        >
          <div
            id={listId}
            role="listbox"
            aria-label="People"
            onMouseDown={(event) => event.preventDefault()}
            className="max-h-64 scroll-py-1 overflow-y-auto p-1"
          >
            {people.map((person, i) => (
              <div
                key={person.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                data-active={i === activeIndex || undefined}
                onMouseMove={() => setActive(i)}
                onClick={() => pick(person)}
                className="flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground select-none data-[active]:bg-accent"
              >
                <Avatar src={person.avatar} name={person.name} size="sm" aria-hidden="true" />
                <span className="truncate">{person.name}</span>
              </div>
            ))}
          </div>
        </AriaPopover>
      )}
    </div>
  );
}

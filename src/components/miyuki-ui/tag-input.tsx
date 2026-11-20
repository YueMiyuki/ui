"use client";

import { CircleAlert } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Popover as AriaPopover,
  Tag as AriaTag,
  TagGroup as AriaTagGroup,
  type Key,
  TagList,
} from "react-aria-components";
import { flushSync } from "react-dom";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type TagInputSize = "sm" | "md" | "lg";

const boxSize: Record<TagInputSize, string> = { sm: "min-h-8 p-[3px]", md: "min-h-9 p-1", lg: "min-h-11 p-1.5" };
const inputStart: Record<TagInputSize, string> = { sm: "ps-[7px]", md: "ps-2", lg: "ps-2" };

const FILL = (() => {
  const steps = 48;
  const seconds = 0.42;
  const points: string[] = [];
  let x = 0;
  let v = 0;
  let t = 0;
  for (let i = 0; i <= steps; i++) {
    const until = (i / steps) * seconds;
    while (t < until) {
      v += (-500 * (x - 1) - 30 * v) / 1200;
      x += v / 1200;
      t += 1 / 1200;
    }
    points.push(i === steps ? "1" : x.toFixed(4));
  }
  return { easing: `linear(${points.join(", ")})`, duration: seconds * 1000 };
})();
const EXIT_MS = 120;
const INPUT_KEY = "\u001finput";

const keyframes = `
@keyframes miyuki-tag-input-in {
  from { opacity: 0; transform: translateY(calc(var(--miyuki-tag-input-dir, -1) * 4px)) scale(0.96); }
}
@keyframes miyuki-tag-input-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes miyuki-tag-input-fade-in { from { opacity: 0; } }
@keyframes miyuki-tag-input-fade-out { to { opacity: 0; } }
`;

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function keyed(tags: string[]) {
  const seen = new Map<string, number>();
  return tags.map((text, index) => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return { text, index, key: n ? `${text}\u001f${n}` : text };
  });
}

function splitOn(text: string, delimiters: string[]) {
  let parts = [text];
  for (const d of delimiters) if (d) parts = parts.flatMap((part) => part.split(d));
  return parts;
}

function rowsOf(box: HTMLElement | null) {
  return box ? [...box.querySelectorAll<HTMLElement>("[role=row][data-key]")] : [];
}

function Highlight({ text, query }: { text: string; query: string }) {
  const at = query ? fold(text).indexOf(fold(query)) : -1;
  if (at < 0 || fold(text).length !== text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="font-semibold">{text.slice(at, at + query.length)}</span>
      {text.slice(at + query.length)}
    </>
  );
}

export interface TagInputProps
  extends Omit<ComponentProps<"div">, "onChange" | "defaultValue" | "children" | "placeholder"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  value?: string[];
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  size?: TagInputSize;
  delimiters?: string[];
  validate?: (tag: string) => true | string;
  maxTags?: number;
  suggestions?: string[];
  allowDuplicates?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  "aria-label"?: string;
}

export function TagInput({
  label,
  description,
  errorMessage,
  value,
  defaultValue,
  onChange,
  placeholder,
  size = "md",
  delimiters = [",", ";", "\n"],
  validate,
  maxTags,
  suggestions,
  allowDuplicates = false,
  isDisabled = false,
  isReadOnly = false,
  "aria-label": ariaLabel,
  className,
  ...props
}: TagInputProps) {
  const reduce = useReducedMotion();
  const id = useId();
  const labelId = `${id}-label`;
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const helpId = `${id}-help`;
  const countId = `${id}-count`;
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const removing = useRef(new Set<string>());
  const refocus = useRef(false);

  const [own, setOwn] = useState<string[]>(defaultValue ?? []);
  const tags = value ?? own;
  const latest = useRef(tags);
  latest.current = tags;
  const items = useMemo(() => keyed(tags), [tags]);

  const [text, setText] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const [said, setSaid] = useState("");

  const full = maxTags != null && tags.length >= maxTags;
  const editable = !isDisabled && !isReadOnly;
  const showInput = editable && !full;

  const problems = useMemo(() => {
    const out = new Map<string, string>();
    if (!validate) return out;
    for (const item of items) {
      const verdict = validate(item.text);
      if (verdict !== true) out.set(item.key, verdict);
    }
    return out;
  }, [items, validate]);
  const firstProblem = items.find((item) => problems.has(item.key));
  const error = errorMessage ?? (firstProblem ? problems.get(firstProblem.key) : undefined);
  const isInvalid = error != null && error !== "";

  const matches = useMemo(() => {
    if (!suggestions?.length) return [];
    const taken = new Set(tags.map((t) => t.toLowerCase()));
    const pool = allowDuplicates ? suggestions : suggestions.filter((s) => !taken.has(s.toLowerCase()));
    const q = fold(text.trim());
    if (!q) return pool;
    const starts = pool.filter((s) => fold(s).startsWith(q));
    const inside = pool.filter((s) => !fold(s).startsWith(q) && fold(s).includes(q));
    return [...starts, ...inside];
  }, [suggestions, tags, text, allowDuplicates]);

  const open = listOpen && focused && showInput && matches.length > 0;
  const activeIndex = open && active < matches.length ? active : -1;

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    if (inputRef.current && document.activeElement !== inputRef.current) inputRef.current.focus();
  });

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  function spot(el: HTMLElement) {
    const base = boxRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - (base?.left ?? 0), y: r.top - (base?.top ?? 0) };
  }

  function snapshot() {
    const spots = new Map<string, { x: number; y: number }>();
    if (reduce) return spots;
    for (const row of rowsOf(boxRef.current)) spots.set(row.dataset.key ?? "", spot(row));
    if (inputRef.current) spots.set(INPUT_KEY, spot(inputRef.current));
    return spots;
  }

  function glide(el: HTMLElement, was: { x: number; y: number } | undefined) {
    if (!was) return;
    const now = spot(el);
    const dx = was.x - now.x;
    const dy = was.y - now.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
      duration: 260,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }

  function commit(next: string[], fresh: string[] = []) {
    const before = snapshot();
    const known = new Set(items.map((item) => item.key));
    flushSync(() => {
      if (value === undefined) setOwn(next);
      onChange?.(next);
    });
    latest.current = next;
    for (const row of rowsOf(boxRef.current)) {
      const key = row.dataset.key ?? "";
      if (known.has(key)) {
        glide(row, before.get(key));
      } else if (fresh.length) {
        row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 120 : 140, easing: "ease-out" });
        if (!reduce) row.animate([{ scale: "0.9" }, { scale: "1" }], FILL);
      }
    }
    if (inputRef.current) glide(inputRef.current, before.get(INPUT_KEY));
  }

  function flash(key: string) {
    const row = rowsOf(boxRef.current).find((el) => el.dataset.key === key);
    if (!row) return;
    const ring = getComputedStyle(row).getPropertyValue("--brand").trim() || "currentColor";
    row.animate(
      [
        { boxShadow: `0 0 0 0px ${ring}` },
        { boxShadow: `0 0 0 2px ${ring}`, offset: 0.25 },
        { boxShadow: `0 0 0 2px ${ring}`, offset: 0.6 },
        { boxShadow: "0 0 0 2px transparent" },
      ],
      { duration: reduce ? 500 : 650, easing: "ease-out" },
    );
  }

  function add(pieces: string[]) {
    const current = latest.current;
    const next = [...current];
    const fresh: string[] = [];
    let repeat: string | null = null;
    for (const raw of pieces) {
      const piece = raw.trim();
      if (!piece) continue;
      if (maxTags != null && next.length >= maxTags) break;
      if (!allowDuplicates) {
        const at = next.findIndex((t) => t.toLowerCase() === piece.toLowerCase());
        if (at >= 0) {
          if (at < current.length) repeat = keyed(current)[at].key;
          continue;
        }
      }
      next.push(piece);
      fresh.push(piece);
    }
    if (fresh.length) {
      commit(next, fresh);
      setSaid(fresh.length === 1 ? `Added ${fresh[0]}` : `Added ${fresh.length} tags`);
    }
    if (repeat != null) {
      flash(repeat);
      if (!fresh.length) setSaid(`${keyed(current).find((item) => item.key === repeat)?.text} is already added`);
    }
    if (maxTags != null && next.length >= maxTags && fresh.length) {
      const rows = rowsOf(boxRef.current);
      rows.at(-1)?.focus();
    }
  }

  function remove(keys: Set<Key>) {
    if (!editable) return;
    const wanted = [...keys].map(String).filter((key) => !removing.current.has(key));
    if (!wanted.length) return;
    const box = boxRef.current;
    const wasInside = box?.contains(document.activeElement) ?? false;
    for (const key of wanted) removing.current.add(key);
    for (const row of rowsOf(box)) if (wanted.includes(row.dataset.key ?? "")) row.setAttribute("data-removing", "");
    const gone = keyed(latest.current).filter((item) => wanted.includes(item.key));
    const finish = () => {
      const left = keyed(latest.current)
        .filter((item) => !wanted.includes(item.key))
        .map((item) => item.text);
      refocus.current = wasInside || (boxRef.current?.contains(document.activeElement) ?? false);
      if (refocus.current) inputRef.current?.focus();
      commit(left);
      for (const key of wanted) removing.current.delete(key);
      setSaid(gone.length === 1 ? `Removed ${gone[0].text}` : `Removed ${gone.length} tags`);
    };
    window.setTimeout(finish, reduce ? 100 : EXIT_MS);
  }

  function take(index: number) {
    const pick = matches[index];
    if (pick == null) return;
    add([pick]);
    setText("");
    setActive(-1);
    setListOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const el = event.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const rtl = getComputedStyle(el).direction === "rtl";
    const typed = text.trim();
    const keys = delimiters.filter((d) => d.length === 1 && d !== "\n" && d !== "\r");

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!suggestions?.length) return;
      event.preventDefault();
      if (!open) {
        setListOpen(true);
        setActive(event.key === "ArrowDown" ? 0 : matches.length - 1);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i < 0 ? (step > 0 ? 0 : matches.length - 1) : (i + step + matches.length) % matches.length));
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setListOpen(false);
      setActive(-1);
      return;
    }
    if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey && (typed || activeIndex >= 0))) {
      if (activeIndex >= 0) {
        event.preventDefault();
        take(activeIndex);
        return;
      }
      if (!typed) return;
      event.preventDefault();
      add([text]);
      setText("");
      setListOpen(false);
      return;
    }
    if (keys.includes(event.key)) {
      event.preventDefault();
      if (!typed) return;
      add([text]);
      setText("");
      setListOpen(false);
      return;
    }
    if (event.key === "Backspace" && text === "" && atStart) {
      if (event.repeat) return;
      const last = rowsOf(boxRef.current).at(-1);
      if (!last) return;
      event.preventDefault();
      last.focus();
      return;
    }
    if (event.key === (rtl ? "ArrowRight" : "ArrowLeft") && atStart && !event.shiftKey) {
      const last = rowsOf(boxRef.current).at(-1);
      if (!last) return;
      event.preventDefault();
      last.focus();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!delimiters.some((d) => d && pasted.includes(d))) return;
    event.preventDefault();
    const el = event.currentTarget;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    add(splitOn(text.slice(0, start) + pasted + text.slice(end), delimiters));
    setText("");
    setListOpen(false);
  }

  function onRowKeys(event: KeyboardEvent<HTMLDivElement>) {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[role=row][data-key]");
    if (!row) return;
    if ((event.key === "Backspace" || event.key === "Delete") && event.repeat) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const rows = rowsOf(boxRef.current);
    const rtl = getComputedStyle(row).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward && row === rows.at(-1)) {
      event.preventDefault();
      event.stopPropagation();
      if (showInput) inputRef.current?.focus();
    } else if (event.key === back && row === rows[0]) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function onBoxMouseDown(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!showInput || target === inputRef.current || target.closest("[role=row]")) return;
    event.preventDefault();
    inputRef.current?.focus();
  }

  const describedBy = [
    label != null || description != null || isInvalid ? helpId : null,
    maxTags != null ? countId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...props}
      className={cn("flex flex-col gap-1.5", isDisabled && "opacity-50", className)}
      data-disabled={isDisabled || undefined}
      data-invalid={isInvalid || undefined}
    >
      {suggestions && (
        <style href="miyuki-tag-input" precedence="miyuki">
          {keyframes}
        </style>
      )}
      {label != null && (
        <label id={labelId} htmlFor={inputId} className="w-fit text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div
        ref={boxRef}
        onMouseDown={onBoxMouseDown}
        onKeyDownCapture={onRowKeys}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
        }}
        className={cn(
          "flex w-full flex-wrap content-center items-center gap-1.5 rounded-lg border text-sm text-foreground outline-none",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
          isReadOnly ? "bg-muted shadow-none" : "bg-card shadow-xs",
          isInvalid
            ? "border-destructive focus-within:ring-[3px] focus-within:ring-destructive/25"
            : cn(
                "border-input focus-within:border-brand focus-within:ring-[3px] focus-within:ring-ring",
                editable && "hover:border-border-strong",
              ),
          showInput ? "cursor-text" : isDisabled && "cursor-not-allowed",
          boxSize[size],
        )}
      >
        <AriaTagGroup
          aria-labelledby={label != null ? labelId : undefined}
          aria-label={label != null ? undefined : (ariaLabel ?? "Tags")}
          onRemove={editable ? remove : undefined}
          disabledKeys={isDisabled ? items.map((item) => item.key) : undefined}
          className="contents"
        >
          <TagList items={items} className="contents" dependencies={[problems, isDisabled]}>
            {(item) => {
              const problem = problems.get(item.key);
              return (
                <AriaTag
                  id={item.key}
                  textValue={problem ? `${item.text}, ${problem}` : item.text}
                  className={cn(
                    "inline-flex h-6 max-w-full min-w-0 cursor-default items-center gap-1 rounded-md text-[13px] leading-5 outline-none select-none",
                    "transition-[scale,opacity,background-color,color,box-shadow] duration-150 ease-settle",
                    "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                    "data-[removing]:pointer-events-none data-[removing]:scale-90 data-[removing]:opacity-0 data-[removing]:duration-[120ms] data-[removing]:ease-in",
                    "motion-reduce:data-[removing]:scale-100",
                    problem ? "bg-destructive-soft text-destructive-strong" : "bg-secondary text-secondary-foreground",
                    problem ? "ps-1.5" : "ps-2",
                    editable ? "pe-0.5" : "pe-2",
                  )}
                >
                  {problem && <CircleAlert aria-hidden="true" className="size-3 shrink-0" strokeWidth={2.25} />}
                  <span className="min-w-0 truncate">{item.text}</span>
                  {editable && (
                    <CloseButton
                      slot="remove"
                      size="sm"
                      aria-label="Remove"
                      className="text-current/70 data-[hovered]:bg-current/10 data-[hovered]:text-current"
                    />
                  )}
                </AriaTag>
              );
            }}
          </TagList>
        </AriaTagGroup>
        {showInput && (
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={text}
            placeholder={tags.length === 0 ? placeholder : undefined}
            disabled={isDisabled}
            autoComplete="off"
            spellCheck={false}
            role={suggestions ? "combobox" : undefined}
            aria-autocomplete={suggestions ? "list" : undefined}
            aria-expanded={suggestions ? open : undefined}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            aria-label={label != null ? undefined : (ariaLabel ?? "Add a tag")}
            aria-describedby={describedBy || undefined}
            aria-invalid={isInvalid || undefined}
            onChange={(event) => {
              setText(event.target.value);
              setActive(-1);
              setListOpen(event.target.value.trim() !== "");
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => {
              setListOpen(false);
              setActive(-1);
            }}
            className={cn(
              "h-6 min-w-24 flex-1 bg-transparent pe-1 text-sm text-foreground outline-none placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed",
              tags.length === 0 ? inputStart[size] : "ps-1",
            )}
          />
        )}
      </div>
      {(description != null || isInvalid || maxTags != null) && (
        <div className="flex items-start justify-between gap-3 text-[13px] leading-5">
          {isInvalid ? (
            <p id={helpId} className="flex min-w-0 items-start gap-1.5 text-destructive">
              <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          ) : description != null ? (
            <p id={helpId} className="min-w-0 text-muted-foreground">
              {description}
            </p>
          ) : (
            <span />
          )}
          {maxTags != null && (
            <span id={countId} className="shrink-0 text-muted-foreground tabular-nums">
              {tags.length} of {maxTags}
            </span>
          )}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
      {suggestions && (
        <AriaPopover
          triggerRef={boxRef}
          isOpen={open}
          onOpenChange={(next) => {
            if (!next) setListOpen(false);
          }}
          isNonModal
          placement="bottom start"
          offset={6}
          className={cn(
            "flex w-(--trigger-width) flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
            "[--miyuki-tag-input-ox:min(calc(var(--trigger-width)/2),100%)] [&[dir=rtl]]:[--miyuki-tag-input-ox:calc(100%_-_min(calc(var(--trigger-width)/2),100%))]",
            "origin-[var(--miyuki-tag-input-ox)_var(--miyuki-tag-input-oy,0px)] data-[placement=top]:[--miyuki-tag-input-oy:100%]",
            "data-[placement=top]:[--miyuki-tag-input-dir:1]",
            "data-[entering]:animate-[miyuki-tag-input-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-tag-input-out_120ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-tag-input-fade-in_120ms_ease-out]",
            "motion-reduce:data-[exiting]:animate-[miyuki-tag-input-fade-out_100ms_ease-in_forwards]",
          )}
        >
          <div
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            onMouseDown={(event) => event.preventDefault()}
            className="max-h-60 scroll-py-1 overflow-y-auto p-1"
          >
            {matches.map((suggestion, i) => (
              <div
                key={suggestion}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                data-active={i === activeIndex || undefined}
                onMouseMove={() => setActive(i)}
                onClick={() => take(i)}
                className="flex cursor-default items-center rounded-md px-2.5 py-1.5 text-sm text-foreground select-none data-[active]:bg-accent"
              >
                <span className="truncate">
                  <Highlight text={suggestion} query={text.trim()} />
                </span>
              </div>
            ))}
          </div>
        </AriaPopover>
      )}
    </div>
  );
}

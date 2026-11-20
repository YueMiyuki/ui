"use client";

import { Check, CircleAlert, Pencil, X } from "lucide-react";
import {
  type ElementType,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { Spinner } from "@/components/miyuki-ui/spinner";
import { cn } from "@/lib/utils";

export type InlineEditElement = "span" | "p" | "h1" | "h2" | "h3";

const keyframes = `
@keyframes miyuki-inline-edit-line {
  0% { transform: scaleX(0); opacity: 1; }
  55% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
@keyframes miyuki-inline-edit-fade {
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
}
`;

type Exit = "keyboard" | "blur";

function failure(error: unknown) {
  if (typeof error === "string" && error) return error;
  if (error instanceof Error && error.message) return error.message;
  return "Could not save. Try again.";
}

export interface InlineEditProps extends Omit<HTMLAttributes<HTMLElement>, "onChange" | "defaultValue" | "children"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => unknown;
  onCancel?: () => void;
  validate?: (value: string) => true | string;
  placeholder?: string;
  as?: InlineEditElement;
  multiline?: boolean;
  submitOnBlur?: boolean;
  showButtons?: boolean;
  label?: string;
  isDisabled?: boolean;
  ref?: Ref<HTMLElement>;
}

export function InlineEdit({
  value,
  defaultValue = "",
  onChange,
  onSave,
  onCancel,
  validate,
  placeholder,
  as = "span",
  multiline = false,
  submitOnBlur = true,
  showButtons = false,
  label,
  isDisabled = false,
  className,
  ref,
  ...props
}: InlineEditProps) {
  const Tag = as as ElementType;
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [wrapped, setWrapped] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const restRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const refocus = useRef(false);
  const errorId = useId();
  const hint = placeholder ?? label ?? "Empty";
  const inline = as === "span";

  useLayoutEffect(() => {
    if (editing) {
      const field = fieldRef.current;
      field?.focus({ preventScroll: true });
      field?.select();
      return;
    }
    busy.current = false;
    if (refocus.current) restRef.current?.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
    refocus.current = false;
  }, [editing]);

  function start() {
    if (isDisabled) return;
    const text = textRef.current;
    if (text && !multiline) {
      const style = getComputedStyle(text);
      const line = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      setWrapped(text.offsetHeight > line * 1.5);
    }
    setDraft(current);
    setError(null);
    setFlash(0);
    setEditing(true);
  }

  function finish(via: Exit) {
    busy.current = true;
    refocus.current = via === "keyboard" && Boolean(rowRef.current?.contains(document.activeElement));
    setPending(false);
    setError(null);
    setEditing(false);
  }

  async function save(via: Exit) {
    if (busy.current) return;
    const next = multiline ? draft.replace(/\s+$/, "") : draft.replace(/\s+/g, " ").trim();
    if (next === current) {
      finish(via);
      return;
    }
    const verdict = validate?.(next);
    if (typeof verdict === "string") {
      setError(verdict);
      return;
    }
    busy.current = true;
    const result = onSave?.(next);
    if (result != null && typeof (result as Promise<unknown>).then === "function") {
      setPending(true);
      setError(null);
      try {
        await result;
      } catch (reason) {
        busy.current = false;
        setPending(false);
        setError(failure(reason));
        if (via === "keyboard") fieldRef.current?.focus({ preventScroll: true });
        return;
      }
    }
    if (value === undefined) setOwn(next);
    onChange?.(next);
    setFlash((n) => n + 1);
    finish(via);
  }

  function cancel(via: Exit) {
    if (busy.current) return;
    setDraft(current);
    onCancel?.();
    finish(via);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel("keyboard");
      return;
    }
    if (event.key !== "Enter") return;
    if (multiline && !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    save("keyboard");
  }

  function onBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!editing || busy.current) return;
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    if (submitOnBlur) save("blur");
    else cancel("blur");
  }

  function focusField(event: MouseEvent) {
    if (!editing || event.target === fieldRef.current) return;
    event.preventDefault();
    fieldRef.current?.focus();
  }

  const area = multiline || wrapped;
  const fieldProps = {
    value: draft,
    placeholder: hint,
    readOnly: pending,
    "aria-label": label,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    "aria-busy": pending || undefined,
    onKeyDown,
    className: cn(
      "absolute inset-0 size-full min-w-0 resize-none overflow-hidden bg-transparent p-0 text-inherit outline-none",
      "[font:inherit] [letter-spacing:inherit] [word-spacing:inherit] placeholder:text-muted-foreground",
      area && "wrap-break-word whitespace-pre-wrap",
    ),
  };

  return (
    <Tag
      {...props}
      ref={ref}
      className={cn(
        "group/inline-edit relative -mx-[7px] -my-[3px] max-w-[calc(100%+14px)] flex-col",
        inline ? "inline-flex align-top" : "flex w-fit",
        className,
      )}
    >
      <style href="miyuki-inline-edit" precedence="miyuki">
        {keyframes}
      </style>
      <span ref={rowRef} onBlur={onBlur} className="flex max-w-full min-w-0 items-start gap-1">
        <span
          onMouseDown={focusField}
          className={cn(
            "group/inline-box relative flex min-w-0 items-start border px-1.5 py-0.5",
            "transition-[border-color,box-shadow,background-color] duration-150 ease-settle",
            !editing && "rounded-md border-transparent",
            !editing && !isDisabled && "hover:bg-accent has-[button:focus-visible]:bg-accent",
            editing && "rounded-lg focus-within:ring-[3px]",
            editing && (pending ? "bg-muted shadow-none" : "bg-card shadow-xs"),
            editing &&
              (error
                ? "border-destructive focus-within:ring-destructive/25"
                : "border-input hover:border-border-strong focus-within:border-brand focus-within:ring-ring"),
          )}
        >
          {editing ? (
            <span className="relative min-w-0">
              <span
                aria-hidden="true"
                className={cn(
                  "invisible block pe-px",
                  area ? "wrap-break-word whitespace-pre-wrap" : "overflow-hidden whitespace-pre",
                )}
              >
                {draft || hint}
                {"\u200b"}
              </span>
              {area ? (
                <textarea
                  {...fieldProps}
                  ref={fieldRef}
                  rows={1}
                  onChange={(event) =>
                    setDraft(multiline ? event.target.value : event.target.value.replace(/[\r\n]+/g, " "))
                  }
                />
              ) : (
                <input {...fieldProps} ref={fieldRef} type="text" onChange={(event) => setDraft(event.target.value)} />
              )}
            </span>
          ) : (
            <span
              ref={textRef}
              className={cn(
                "relative min-w-0 wrap-break-word",
                multiline && "whitespace-pre-wrap",
                current === "" && "text-muted-foreground",
              )}
            >
              {current === "" ? hint : current}
              {flash > 0 && (
                <span
                  key={flash}
                  aria-hidden="true"
                  onAnimationEnd={() => setFlash(0)}
                  className={cn(
                    "pointer-events-none absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand ink:bg-chart-1 rtl:origin-right",
                    "animate-[miyuki-inline-edit-line_500ms_cubic-bezier(0.22,1,0.36,1)_both]",
                    "motion-reduce:animate-[miyuki-inline-edit-fade_500ms_ease-out_both]",
                  )}
                />
              )}
            </span>
          )}
          <span
            aria-hidden={pending ? undefined : true}
            className="ms-1.5 flex h-[1lh] w-[clamp(14px,0.6em,18px)] shrink-0 items-center justify-center"
          >
            {editing ? (
              pending && <Spinner size="xs" label="Saving" />
            ) : isDisabled ? null : (
              <Pencil
                strokeWidth={2}
                className={cn(
                  "size-[clamp(14px,0.6em,18px)] text-muted-foreground opacity-0",
                  "-translate-x-0.5 transition-[opacity,translate] duration-150 ease-settle",
                  "group-hover/inline-box:translate-x-0 group-hover/inline-box:opacity-100",
                  "group-has-[button:focus-visible]/inline-box:translate-x-0 group-has-[button:focus-visible]/inline-box:opacity-100",
                  "motion-reduce:translate-x-0",
                )}
              />
            )}
          </span>
          {!editing && !isDisabled && (
            <button
              ref={restRef}
              type="button"
              aria-label={label ? `Edit ${label}` : "Edit"}
              onClick={start}
              onKeyDown={(event) => {
                if (event.key !== "F2") return;
                event.preventDefault();
                start();
              }}
              className="absolute -inset-px cursor-text rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            />
          )}
        </span>
        {editing && showButtons && (
          <span
            onMouseDown={(event) => event.preventDefault()}
            className="flex h-[calc(1lh+6px)] shrink-0 items-center gap-0.5"
          >
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Save"
              preventFocusOnPress
              onPress={() => save("keyboard")}
              className={cn("size-7 rounded-md", pending && "pointer-events-none opacity-50")}
            >
              <Check strokeWidth={2.25} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Cancel"
              preventFocusOnPress
              onPress={() => cancel("keyboard")}
              className={cn(
                "size-7 rounded-md text-muted-foreground data-[hovered]:text-foreground",
                pending && "pointer-events-none opacity-50",
              )}
            >
              <X strokeWidth={2.25} />
            </IconButton>
          </span>
        )}
      </span>
      {editing && error && (
        <span
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 px-[7px] font-sans text-[13px] leading-5 font-normal tracking-normal text-destructive normal-case"
        >
          <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
          <span>{error}</span>
        </span>
      )}
    </Tag>
  );
}

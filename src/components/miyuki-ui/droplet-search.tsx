"use client";

import { Search } from "lucide-react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { type ComponentProps, type Ref, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DropletSearchProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue" | "children"> {
  placeholder?: string;
  collapsedWidth?: number;
  expandedWidth?: number;
  gooeyBlur?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
  ref?: Ref<HTMLDivElement>;
}

const HEIGHT = 40;
const PAD = 16;

export function DropletSearch({
  placeholder = "Search",
  collapsedWidth = 115,
  expandedWidth = 220,
  gooeyBlur = 6,
  value,
  defaultValue = "",
  onValueChange,
  onOpenChange,
  disabled = false,
  name,
  "aria-label": ariaLabel,
  className,
  style,
  ref,
  ...props
}: DropletSearchProps) {
  const filterId = `miyuki-droplet-search-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [own, setOwn] = useState(defaultValue);
  const text = value ?? own;
  const [focused, setFocused] = useState(false);
  const open = focused || text !== "";

  const gap = Math.max(10, Math.round(gooeyBlur * 2.4));
  const closedX = collapsedWidth - HEIGHT;
  const openX = expandedWidth + gap;

  const [initialOpen] = useState(open);
  const pill = useMotionValue(initialOpen ? expandedWidth : collapsedWidth);
  const drop = useMotionValue(initialOpen ? openX : closedX);
  const outer = useTransform(() => Math.max(pill.get(), drop.get() + HEIGHT));
  const overlap = useTransform(() => Math.min(HEIGHT, Math.max(0, pill.get() - drop.get())));
  const field = useTransform(() => pill.get() - overlap.get());
  const ring = useTransform(() => pill.get() - 3);
  const padEnd = useTransform(() => 14 - (overlap.get() / HEIGHT) * 10);
  const rootRef = useRef<HTMLDivElement | null>(null);
  useMotionValueEvent(outer, "change", (w) => {
    if (rootRef.current) rootRef.current.style.width = `${w}px`;
  });

  const onOpenRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenRef.current = onOpenChange;
  });
  const reported = useRef(open);
  useEffect(() => {
    if (reported.current === open) return;
    reported.current = open;
    onOpenRef.current?.(open);
  }, [open]);

  useEffect(() => {
    const width = open ? expandedWidth : collapsedWidth;
    const x = open ? openX : closedX;
    if (reduce) {
      const a = animate(pill, width, { duration: 0.12, ease: "easeOut" });
      const b = animate(drop, x, { duration: 0.12, ease: "easeOut" });
      return () => {
        a.stop();
        b.stop();
      };
    }
    const a = animate(
      pill,
      width,
      open
        ? { type: "spring", stiffness: 210, damping: 24 }
        : { type: "spring", stiffness: 320, damping: 32, delay: 0.05 },
    );
    const b = animate(
      drop,
      x,
      open ? { type: "spring", stiffness: 300, damping: 20 } : { type: "spring", stiffness: 380, damping: 30 },
    );
    return () => {
      a.stop();
      b.stop();
    };
  }, [open, expandedWidth, collapsedWidth, openX, closedX, reduce, pill, drop]);

  const update = (next: string) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const shape = "absolute top-3 left-3 h-10 rounded-full bg-primary";

  return (
    <div
      {...props}
      ref={(el) => {
        rootRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      data-open={open || undefined}
      className={cn(
        "group/gooey relative inline-block h-10 shrink-0 align-middle",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      style={{ ...style, width: initialOpen ? Math.max(expandedWidth, openX + HEIGHT) : collapsedWidth }}
    >
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <filter id={filterId} x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={gooeyBlur} result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <motion.div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-[1.5px] left-[1.5px] h-[37px] rounded-full opacity-0 ring-[4.5px] ring-ring transition-opacity duration-150",
          "group-has-[input:focus-visible]/gooey:opacity-100",
        )}
        style={{ width: ring }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute -inset-3" style={{ filter: `url(#${filterId})` }}>
        <motion.div className={shape} style={{ width: pill }} />
        <motion.div className={cn(shape, "w-10")} style={{ x: drop }} />
      </div>
      <motion.input
        ref={inputRef}
        type="search"
        name={name}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          if (text !== "") update("");
          else e.currentTarget.blur();
        }}
        style={{ width: field, paddingLeft: PAD, paddingRight: padEnd }}
        className={cn(
          "absolute top-0 left-0 h-10 min-w-0 cursor-text truncate rounded-full bg-transparent text-sm text-primary-foreground caret-primary-foreground outline-none",
          "placeholder:text-primary-foreground/65 selection:bg-primary-foreground/25",
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
        )}
      />
      <motion.span
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className="absolute top-0 left-0 grid size-10 cursor-text place-items-center text-primary-foreground"
        style={{ x: drop }}
      >
        <Search className="size-4" strokeWidth={2} />
      </motion.span>
    </div>
  );
}

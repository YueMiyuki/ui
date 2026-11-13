"use client";

import {
  AnimatePresence,
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type ComponentProps, type FocusEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export interface GlassDockItem {
  title: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

export interface GlassDockProps extends Omit<ComponentProps<"nav">, "children"> {
  items: GlassDockItem[];
  magnification?: number;
  distance?: number;
}

const BASE = 40;
const WAVE = { stiffness: 380, damping: 28, mass: 0.6 };
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

const tileStyles = cn(
  "relative grid shrink-0 cursor-default place-items-center rounded-full outline-none select-none",
  "bg-card text-foreground/80 shadow-xs ring-1 ring-foreground/[0.06] ring-inset dark:bg-accent",
  "transition-[color,background-color,box-shadow] duration-150 hover:text-foreground",
  "focus-visible:ring-[3px] focus-visible:ring-ring",
);

export function GlassDock({
  items,
  magnification = 1.8,
  distance = 140,
  className,
  "aria-label": ariaLabel = "Dock",
  ...props
}: GlassDockProps) {
  const pointer = useMotionValue(Infinity);
  const reduce = useReducedMotion();

  return (
    <nav {...props} aria-label={ariaLabel} className={cn("relative inline-flex", className)}>
      <ul
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") pointer.set(event.clientX);
        }}
        onPointerLeave={() => pointer.set(Infinity)}
        className="hidden h-14 items-end gap-2 rounded-2xl border border-border bg-card/70 p-2 shadow-md backdrop-blur-xl md:flex"
      >
        {items.map((item) => (
          <DockTile
            key={item.title}
            item={item}
            pointer={pointer}
            peak={reduce ? BASE : BASE * magnification}
            distance={distance}
          />
        ))}
      </ul>
      <DockStack items={items} />
    </nav>
  );
}

function DockTile({
  item,
  pointer,
  peak,
  distance,
}: {
  item: GlassDockItem;
  pointer: MotionValue<number>;
  peak: number;
  distance: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [label, setLabel] = useState(false);
  const reduce = useReducedMotion();
  const lift = useMotionValue(0);

  const target = useTransform(pointer, (x) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || !Number.isFinite(x)) return BASE;
    const d = Math.min(1, Math.abs(x - (box.left + box.width / 2)) / distance);
    return BASE + (peak - BASE) * ((1 + Math.cos(Math.PI * d)) / 2);
  });
  const size = useSpring(target, WAVE);
  const glyph = useTransform(size, (s) => Math.round(s * 0.45));

  const bounce = () => {
    if (reduce) return;
    animate(lift, [0, -10, 0], { duration: 0.42, times: [0, 0.38, 1], ease: ["easeOut", [0.34, 1.4, 0.64, 1]] });
  };

  const props = {
    "aria-label": item.title,
    "aria-current": item.current ? ("page" as const) : undefined,
    onPointerEnter: () => setLabel(true),
    onPointerLeave: () => setLabel(false),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      setLabel(true);
      if (event.currentTarget.matches(":focus-visible")) {
        const box = event.currentTarget.getBoundingClientRect();
        pointer.set(box.left + box.width / 2);
      }
    },
    onBlur: () => {
      setLabel(false);
      pointer.set(Infinity);
    },
    onClick: () => {
      bounce();
      item.onClick?.();
    },
    style: { width: size, height: size, y: lift },
    className: tileStyles,
  };

  const inner = (
    <>
      <motion.span
        aria-hidden="true"
        className="flex items-center justify-center [&_svg]:size-full [&_svg]:pointer-events-none"
        style={{ width: glyph, height: glyph }}
      >
        {item.icon}
      </motion.span>
      {item.current && (
        <span
          aria-hidden="true"
          className="absolute -bottom-[6px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand"
        />
      )}
      <AnimatePresence>
        {label && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0, y: 4, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%", transition: { duration: 0.1 } }}
            transition={reduce ? { duration: 0.12 } : SETTLE}
            className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 rounded-md border border-border bg-popover px-2 py-1 text-xs leading-4 font-medium whitespace-nowrap text-popover-foreground shadow-md"
          >
            {item.title}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <li className="flex">
      {item.href ? (
        <motion.a ref={(el: HTMLAnchorElement | null) => void (ref.current = el)} href={item.href} {...props}>
          {inner}
        </motion.a>
      ) : (
        <motion.button ref={(el: HTMLButtonElement | null) => void (ref.current = el)} type="button" {...props}>
          {inner}
        </motion.button>
      )}
    </li>
  );
}

function DockStack({ items }: { items: GlassDockItem[] }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const count = items.length;

  return (
    <div ref={root} className="relative md:hidden">
      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            className="absolute bottom-full left-1 mb-3 flex flex-col gap-2"
            initial="closed"
            animate="open"
            exit="closed"
          >
            {items.map((item, i) => {
              const fromButton = count - 1 - i;
              const row = cn(
                "flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              );
              const content = (
                <>
                  <span className={cn(tileStyles, "size-10 [&_svg]:size-[18px]")}>
                    {item.icon}
                    {item.current && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 -left-2 size-1 -translate-y-1/2 rounded-full bg-brand"
                      />
                    )}
                  </span>
                  <span className="rounded-md border border-border bg-popover px-2 py-1 text-xs leading-4 font-medium whitespace-nowrap text-popover-foreground shadow-sm">
                    {item.title}
                  </span>
                </>
              );
              return (
                <motion.li
                  key={item.title}
                  variants={{
                    open: {
                      opacity: 1,
                      y: 0,
                      transition: reduce
                        ? { duration: 0.12 }
                        : { ...SETTLE, delay: Math.min(fromButton * 0.035, 0.24) },
                    },
                    closed: {
                      opacity: 0,
                      y: reduce ? 0 : 8,
                      transition: { duration: 0.1, delay: Math.min(i * 0.015, 0.08) },
                    },
                  }}
                >
                  {item.href ? (
                    <a
                      href={item.href}
                      aria-current={item.current ? "page" : undefined}
                      onClick={() => {
                        item.onClick?.();
                        setOpen(false);
                      }}
                      className={row}
                    >
                      {content}
                    </a>
                  ) : (
                    <button
                      type="button"
                      aria-current={item.current ? "page" : undefined}
                      onClick={() => {
                        item.onClick?.();
                        setOpen(false);
                      }}
                      className={cn(row, "cursor-default")}
                    >
                      {content}
                    </button>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
      <button
        ref={button}
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "grid size-12 cursor-default place-items-center rounded-full border border-border bg-card/70 text-foreground shadow-md backdrop-blur-xl outline-none",
          "transition-[transform,background-color,box-shadow] duration-150 ease-settle active:scale-[0.96]",
          "focus-visible:ring-[3px] focus-visible:ring-ring",
        )}
      >
        <MorphIcon shapes={morphIcons.menuClose} shape={open ? "close" : "menu"} size={20} />
      </button>
    </div>
  );
}

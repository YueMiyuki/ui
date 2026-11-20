"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

export interface ShrinkingHeaderItem {
  name: string;
  href: string;
  current?: boolean;
}

export interface ShrinkingHeaderProps extends Omit<ComponentProps<"header">, "children"> {
  logo?: ReactNode;
  items: ShrinkingHeaderItem[];
  actions?: ReactNode;
  threshold?: number;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

interface Highlight {
  index: number;
  on: boolean;
  moved: boolean;
  run: number;
}

function useHighlight() {
  const [hl, setHl] = useState<Highlight>({ index: -1, on: false, moved: false, run: 0 });
  const enter = (index: number) =>
    setHl((h) =>
      h.on ? { ...h, index, moved: h.index !== index || h.moved } : { index, on: true, moved: false, run: h.run + 1 },
    );
  const leave = (index?: number) => setHl((h) => (index === undefined || h.index === index ? { ...h, on: false } : h));
  return { hl, enter, leave };
}

export function ShrinkingHeader({
  logo,
  items,
  actions,
  threshold = 60,
  className,
  "aria-label": ariaLabel = "Main",
  ...props
}: ShrinkingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { hl, enter, leave } = useHighlight();
  const reduce = useReducedMotion();
  const groupId = useId();
  const menuId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <header {...props} className={cn("sticky top-0 z-50 flex h-16 items-start justify-center", className)}>
      <div
        ref={barRef}
        data-scrolled={scrolled || undefined}
        className={cn(
          "group/bar relative flex h-16 w-[min(100%,72rem)] items-center gap-4 border border-transparent px-5",
          "transition-[width,height,translate,border-radius,background-color,border-color,box-shadow,padding] duration-300 ease-settle motion-reduce:transition-none",
          "data-[scrolled]:h-[52px] data-[scrolled]:w-[min(100%-24px,max(60%,720px))] data-[scrolled]:translate-y-3 data-[scrolled]:rounded-[26px] data-[scrolled]:px-2",
          "data-[scrolled]:border-border data-[scrolled]:bg-card/70 data-[scrolled]:shadow-md data-[scrolled]:backdrop-blur-xl",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center ps-0 transition-[padding] duration-300 ease-settle group-data-[scrolled]/bar:ps-1">
          {logo}
        </div>

        <nav aria-label={ariaLabel} className="hidden lg:block">
          <LayoutGroup id={groupId}>
            <ul className="flex items-center" onPointerLeave={() => leave()}>
              {items.map((item, i) => (
                <li key={`${item.href}-${item.name}`} className="flex">
                  <a
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                    onPointerEnter={() => enter(i)}
                    onFocus={() => enter(i)}
                    onBlur={() => leave(i)}
                    className={cn(
                      "relative flex h-9 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap outline-none select-none",
                      "text-foreground/70 transition-[color,box-shadow] duration-150 ease-settle hover:text-foreground",
                      "aria-[current=page]:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring",
                    )}
                  >
                    {hl.index === i && (
                      <motion.span
                        layoutId={`highlight-${hl.run}`}
                        aria-hidden="true"
                        className="absolute inset-0 bg-accent"
                        style={{ borderRadius: 999 }}
                        initial={hl.moved ? false : { opacity: 0 }}
                        animate={{ opacity: hl.on ? 1 : 0 }}
                        transition={
                          reduce ? { duration: 0 } : { ...SETTLE, opacity: { duration: hl.on ? 0.15 : 0.12 } }
                        }
                      />
                    )}
                    <span className="relative z-10">{item.name}</span>
                    {item.current && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[3px] left-1/2 z-10 size-1 -translate-x-1/2 rounded-full bg-brand"
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </LayoutGroup>
        </nav>

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 lg:flex">{actions}</div>

        <button
          ref={buttonRef}
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "grid size-10 shrink-0 cursor-default place-items-center rounded-full text-foreground outline-none lg:hidden",
            "transition-[background-color,transform,box-shadow] duration-150 ease-settle hover:bg-accent active:scale-[0.96]",
            "focus-visible:ring-[3px] focus-visible:ring-ring",
          )}
        >
          <MorphIcon shapes={morphIcons.menuClose} shape={open ? "close" : "menu"} size={20} strokeWidth={1.75} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              id={menuId}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: 0.12 } }}
              transition={reduce ? { duration: 0.12 } : SETTLE}
              className={cn(
                "absolute inset-x-3 top-full mt-2 origin-[calc(100%_-_28px)_0] rtl:origin-[28px_0] rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-lg lg:hidden",
                "group-data-[scrolled]/bar:inset-x-0",
              )}
            >
              <nav aria-label={ariaLabel}>
                <ul className="flex flex-col">
                  {items.map((item) => (
                    <li key={`${item.href}-${item.name}`}>
                      <a
                        href={item.href}
                        aria-current={item.current ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-foreground outline-none",
                          "transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring",
                        )}
                      >
                        {item.name}
                        {item.current && <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              {actions != null && (
                <div className="mt-2 flex gap-2 border-t border-border px-1 pt-3 pb-1 [&>*]:flex-1">{actions}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

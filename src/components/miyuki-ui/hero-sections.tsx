"use client";

import {
  AnimatePresence,
  type MotionValue,
  motion,
  type Transition,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ArrivingText } from "@/components/miyuki-ui/arriving-text";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const RISE: Transition = { type: "spring", stiffness: 70, damping: 18, mass: 1.1 };

export interface HeroLink {
  label: string;
  href: string;
}

export interface HeroSimpleProps extends Omit<ComponentProps<"section">, "title"> {
  brand: ReactNode;
  links?: HeroLink[];
  signIn?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  preview?: ReactNode;
}

export function HeroSimple({
  brand,
  links = [],
  signIn,
  title,
  description,
  actions,
  preview,
  className,
  ...props
}: HeroSimpleProps) {
  const reduced = useReducedMotion() ?? false;
  const words = title.split(/\s+/).length;
  const textDone = reduced ? 0 : Math.min(1.1, words * 0.07 + 0.3);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const fadeUp = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { ...SETTLE, delay } };

  return (
    <section {...props} className={cn("@container relative isolate overflow-clip", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(55%_65%_at_50%_0%,color-mix(in_oklab,var(--brand)_11%,transparent),transparent)] dark:bg-[radial-gradient(55%_65%_at_50%_0%,color-mix(in_oklab,var(--brand)_14%,transparent),transparent)]"
      />
      <header
        ref={headerRef}
        className="relative z-20 border-b border-border"
        onBlur={(e) => {
          if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <div className="flex min-w-0 flex-1 items-center">{brand}</div>
          {links.length > 0 ? (
            <nav aria-label="Main" className="hidden items-center gap-1 @3xl:flex">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
          <div className="flex flex-1 items-center justify-end gap-2">
            {signIn}
            {links.length > 0 ? (
              <button
                ref={menuButtonRef}
                type="button"
                aria-label="Menu"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen((o) => !o)}
                className="-me-2 grid size-9 shrink-0 cursor-default place-items-center rounded-lg text-foreground outline-none transition-[background-color,transform] duration-150 ease-settle hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring active:scale-[0.96] @3xl:hidden"
              >
                <MorphIcon
                  shapes={morphIcons.menuClose}
                  shape={menuOpen ? "close" : "menu"}
                  size={20}
                  strokeWidth={1.75}
                />
              </button>
            ) : null}
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && links.length > 0 ? (
            <motion.div
              id={menuId}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -4, transition: { duration: 0.12 } }}
              transition={reduced ? { duration: 0.12 } : SETTLE}
              className="absolute inset-x-3 top-full mt-2 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg @3xl:hidden"
            >
              <nav aria-label="Main">
                <ul className="flex flex-col">
                  {links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex h-11 items-center rounded-md px-3 text-[15px] font-medium text-foreground outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <div className="relative mx-auto max-w-5xl px-6 pt-16 text-center @3xl:pt-20">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-px bg-linear-to-b from-border via-border to-transparent"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-px bg-linear-to-b from-border via-border to-transparent"
        />
        <ArrivingText
          as="h1"
          text={title}
          startOnView={false}
          stagger={0.07}
          duration={0.6}
          className="mx-auto max-w-[22ch] font-display text-[2.75rem] leading-[1.03] font-semibold tracking-[-0.035em] text-balance @xl:text-6xl @4xl:text-[4.25rem]"
        />
        {description ? (
          <motion.p
            {...fadeUp(textDone * 0.6)}
            className="mx-auto mt-6 max-w-[34rem] text-lg/8 text-balance text-muted-foreground"
          >
            {description}
          </motion.p>
        ) : null}
        {actions ? (
          <motion.div {...fadeUp(textDone * 0.75)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {actions}
          </motion.div>
        ) : null}
        {preview ? (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 72, rotateX: 9 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, rotateX: 0 }}
            transition={
              reduced
                ? { duration: 0.2 }
                : { ...RISE, delay: textDone * 0.85, opacity: { duration: 0.6, delay: textDone * 0.85 } }
            }
            style={{ transformPerspective: 1600, transformOrigin: "50% 0%" }}
            className="mt-12 @3xl:mt-14"
          >
            <div className="rounded-3xl border border-border bg-card/70 p-2 shadow-2xl backdrop-blur-sm">
              <div className="relative overflow-clip rounded-[14px] border border-border">{preview}</div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}

export interface HeroSplitImage {
  src: string;
  alt?: string;
  label?: ReactNode;
}

export interface HeroSplitProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footnote?: ReactNode;
  images: HeroSplitImage[];
  shift?: number;
}

const CARD_PLACES = [
  { className: "left-[2%] top-[3%] w-[44%]", rotate: -8, depth: 0.35 },
  { className: "right-[1%] top-[9%] w-[44%]", rotate: 6, depth: 0.6 },
  { className: "left-[25%] top-[21%] w-[49%]", rotate: -2, depth: 1 },
];

export function HeroSplit({
  title,
  description,
  actions,
  footnote,
  images,
  shift = 22,
  className,
  onPointerMove,
  onPointerLeave,
  ...props
}: HeroSplitProps) {
  const reduced = useReducedMotion() ?? false;
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 110, damping: 20, mass: 0.8 });
  const sy = useSpring(py, { stiffness: 110, damping: 20, mass: 0.8 });

  const fadeUp = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...SETTLE, delay } };

  return (
    <section
      {...props}
      className={cn("@container relative isolate overflow-clip", className)}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (reduced || e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)));
        py.set(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)));
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        px.set(0);
        py.set(0);
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 -z-10 h-full w-[60%] bg-[radial-gradient(60%_55%_at_70%_45%,color-mix(in_oklab,var(--brand)_10%,transparent),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-16 @4xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @4xl:gap-10 @4xl:py-24">
        <div>
          <motion.h1
            {...fadeUp(0.05)}
            className="max-w-[16ch] font-display text-[2.75rem] leading-[1.03] font-semibold tracking-[-0.035em] text-balance @xl:text-6xl @5xl:text-[3.75rem]"
          >
            {title}
          </motion.h1>
          {description ? (
            <motion.p {...fadeUp(0.14)} className="mt-6 max-w-[30rem] text-lg/8 text-pretty text-muted-foreground">
              {description}
            </motion.p>
          ) : null}
          {actions ? (
            <motion.div {...fadeUp(0.22)} className="mt-9 flex flex-wrap items-center gap-3">
              {actions}
            </motion.div>
          ) : null}
          {footnote ? (
            <motion.div {...fadeUp(0.3)} className="mt-10 text-sm text-muted-foreground">
              {footnote}
            </motion.div>
          ) : null}
        </div>
        <div className="relative mx-auto aspect-[5/4] w-full max-w-[34rem]">
          {images.slice(0, 3).map((image, i) => (
            <HeroCard
              key={image.src + i}
              image={image}
              place={CARD_PLACES[i]}
              index={i}
              x={sx}
              y={sy}
              shift={shift}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroCard({
  image,
  place,
  index,
  x,
  y,
  shift,
  reduced,
}: {
  image: HeroSplitImage;
  place: (typeof CARD_PLACES)[number];
  index: number;
  x: MotionValue<number>;
  y: MotionValue<number>;
  shift: number;
  reduced: boolean;
}) {
  const tx = useTransform(x, (v) => v * shift * place.depth);
  const ty = useTransform(y, (v) => v * shift * place.depth * 0.75);
  const tr = useTransform(x, (v) => v * 2.2 * place.depth);

  return (
    <motion.div className={cn("absolute", place.className)} style={{ x: tx, y: ty, rotate: tr, zIndex: index }}>
      <motion.figure
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 36, rotate: 0, scale: 0.96 }}
        animate={reduced ? { opacity: 1, rotate: place.rotate } : { opacity: 1, y: 0, rotate: place.rotate, scale: 1 }}
        transition={
          reduced
            ? { duration: 0.2 }
            : {
                type: "spring",
                stiffness: 140,
                damping: 20,
                delay: 0.25 + index * 0.1,
                opacity: { duration: 0.4, delay: 0.25 + index * 0.1 },
              }
        }
        className="relative aspect-[4/5] overflow-clip rounded-2xl bg-muted shadow-xl ring-1 ring-foreground/10"
      >
        <img src={image.src} alt={image.alt ?? ""} draggable={false} className="size-full object-cover" />
        {image.label ? (
          <figcaption className="absolute top-3 left-3 rounded-xl border border-foreground/10 bg-card/80 px-3 py-2 text-xs shadow-sm backdrop-blur-md">
            {image.label}
          </figcaption>
        ) : null}
      </motion.figure>
    </motion.div>
  );
}

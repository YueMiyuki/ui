"use client";

import { ChevronDown } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  type MotionValue,
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const GAP = 12;
const EDGE = 8;
const RADIUS = 14;

interface Entry {
  trigger: HTMLElement | null;
  content: HTMLElement | null;
}

interface Highlight {
  id: string | null;
  on: boolean;
  moved: boolean;
  run: number;
}

interface MenuContextValue {
  active: string | null;
  dir: number;
  hl: Highlight;
  frame: { x: MotionValue<number>; w: MotionValue<number>; h: MotionValue<number> };
  entries: Map<string, Entry>;
  open: (id: string, how: "hover" | "focus" | "press") => void;
  close: (refocus?: boolean) => void;
  closeSoon: () => void;
  keep: () => void;
  hoverIn: (id: string) => void;
  move: (from: HTMLElement, key: string) => boolean;
  quiet: RefObject<boolean>;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("GlidingMenuItem must be used inside GlidingMenu");
  return ctx;
}

export interface GlidingMenuProps extends Omit<ComponentProps<"nav">, "children"> {
  children?: ReactNode;
}

export function GlidingMenu({ className, children, "aria-label": ariaLabel = "Main", ...props }: GlidingMenuProps) {
  const reduce = useReducedMotion();
  const groupId = useId();
  const nav = useRef<HTMLElement>(null);
  const [entries] = useState(() => new Map<string, Entry>());
  const [active, setActive] = useState<string | null>(null);
  const [dir, setDir] = useState(0);
  const [hl, setHl] = useState<Highlight>({ id: null, on: false, moved: false, run: 0 });
  const timer = useRef(0);
  const openedAt = useRef(0);
  const quiet = useRef(false);
  const wasOpen = useRef(false);

  const x = useSpring(0, SETTLE);
  const w = useSpring(0, SETTLE);
  const h = useSpring(0, SETTLE);
  const nx = useSpring(0, SETTLE);
  const notch = useTransform(() => nx.get() - x.get() - 6);

  const order = () => Array.from(nav.current?.querySelectorAll<HTMLElement>("[data-gliding-menu-top]") ?? []);

  const open = (id: string, how: "hover" | "focus" | "press") => {
    window.clearTimeout(timer.current);
    if (how === "press" && active === id && performance.now() - openedAt.current > 400) {
      setActive(null);
      return;
    }
    if (active !== id) {
      const list = order().map((el) => el.dataset.glidingMenuTop);
      setDir(active === null ? 0 : Math.sign(list.indexOf(id) - list.indexOf(active)));
      openedAt.current = performance.now();
      setActive(id);
    }
  };

  const close = (refocus = false) => {
    window.clearTimeout(timer.current);
    if (refocus && active) {
      quiet.current = true;
      entries.get(active)?.trigger?.focus();
      quiet.current = false;
    }
    setActive(null);
  };

  const closeSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(null), 160);
  };

  const keep = () => window.clearTimeout(timer.current);

  const hoverIn = (id: string) =>
    setHl((v) => (v.on ? { ...v, id, moved: v.id !== id || v.moved } : { id, on: true, moved: false, run: v.run + 1 }));

  const move = (from: HTMLElement, key: string) => {
    const list = order();
    const i = list.indexOf(from);
    if (i < 0) return false;
    const next =
      key === "ArrowRight"
        ? list[(i + 1) % list.length]
        : key === "ArrowLeft"
          ? list[(i - 1 + list.length) % list.length]
          : key === "Home"
            ? list[0]
            : key === "End"
              ? list[list.length - 1]
              : null;
    next?.focus();
    return next != null;
  };

  const place = useCallback(
    (id: string, jump: boolean) => {
      const entry = entries.get(id);
      const root = nav.current;
      if (!entry?.content || !entry.trigger || !root) return;
      const panel = entry.content.firstElementChild as HTMLElement | null;
      if (!panel) return;
      const navBox = root.getBoundingClientRect();
      const trig = entry.trigger.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const center = trig.left + trig.width / 2 - navBox.left;
      const min = EDGE - navBox.left;
      const max = document.documentElement.clientWidth - EDGE - navBox.left - width;
      const left = Math.round(Math.max(min, Math.min(max, center - width / 2)));
      entry.content.style.left = `${left}px`;
      entry.content.dataset.left = String(left);
      entry.content.dataset.width = String(width);
      entry.content.dataset.height = String(height);
      const set = (v: MotionValue<number>, to: number) => (jump ? v.jump(to) : v.set(to));
      set(x, left);
      set(w, width);
      set(h, height);
      set(nx, center);
    },
    [entries, x, w, h, nx],
  );

  useLayoutEffect(() => {
    if (active === null) {
      wasOpen.current = false;
      return;
    }
    place(active, !wasOpen.current || reduce === true);
    wasOpen.current = true;
    const content = entries.get(active)?.content?.firstElementChild;
    if (!content) return;
    const observer = new ResizeObserver(() => place(active, reduce === true));
    observer.observe(content);
    const onResize = () => place(active, true);
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [active, place, entries, reduce]);

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const inside = nav.current?.contains(document.activeElement);
      close(inside);
    };
    const onPointer = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <nav
      {...props}
      ref={nav}
      aria-label={ariaLabel}
      onPointerEnter={keep}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") closeSoon();
        setHl((v) => ({ ...v, on: false }));
      }}
      onBlur={(event) => {
        if (!nav.current?.contains(event.relatedTarget as Node | null) && event.relatedTarget !== null) setActive(null);
      }}
      className={cn("relative", className)}
    >
      <MenuContext
        value={{ active, dir, hl, frame: { x, w, h }, entries, open, close, closeSoon, keep, hoverIn, move, quiet }}
      >
        <LayoutGroup id={groupId}>
          <ul className="flex items-center">{children}</ul>
        </LayoutGroup>
      </MenuContext>
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={
          active !== null
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: reduce ? 0 : -4, scale: reduce ? 1 : 0.98 }
        }
        transition={active !== null ? (reduce ? { duration: 0.12 } : SETTLE) : { duration: 0.12 }}
        className="pointer-events-none absolute top-full left-0 z-40 origin-top border border-border bg-popover shadow-lg"
        style={{ x, width: w, height: h, marginTop: GAP, borderRadius: RADIUS }}
      >
        <motion.span
          className="absolute -top-[6.5px] left-0 size-3 rounded-tl-[3px] border-t border-l border-border bg-popover"
          style={{ x: notch, rotate: 45 }}
        />
      </motion.div>
    </nav>
  );
}

const topStyles = cn(
  "relative flex h-9 cursor-default items-center gap-1 rounded-lg px-3 text-sm font-medium whitespace-nowrap outline-none select-none",
  "text-foreground/70 transition-[color,box-shadow] duration-150 ease-settle hover:text-foreground",
  "aria-expanded:text-foreground aria-[current=page]:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring",
);

export interface GlidingMenuItemProps extends Omit<ComponentProps<"li">, "children"> {
  label: ReactNode;
  href?: string;
  current?: boolean;
  children?: ReactNode;
}

export function GlidingMenuItem({ label, href, current = false, children, className, ...props }: GlidingMenuItemProps) {
  const ctx = useMenu();
  const reduce = useReducedMotion();
  const id = useId();
  const panelId = `${id}-panel`;
  const isOpen = ctx.active === id;
  const hasPanel = children != null;

  const setTrigger = (el: HTMLElement | null) => {
    if (!el) return;
    const entry = ctx.entries.get(id) ?? { trigger: null, content: null };
    entry.trigger = el;
    ctx.entries.set(id, entry);
  };
  const setContent = (el: HTMLDivElement | null) => {
    if (!el) return;
    const entry = ctx.entries.get(id) ?? { trigger: null, content: null };
    entry.content = el;
    ctx.entries.set(id, entry);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (ctx.move(event.currentTarget, event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowDown" && hasPanel) {
      event.preventDefault();
      ctx.open(id, "focus");
      requestAnimationFrame(() => {
        ctx.entries.get(id)?.content?.querySelector<HTMLElement>("a, button, [tabindex]")?.focus();
      });
    }
  };

  const highlight = ctx.hl.id === id && (
    <motion.span
      layoutId={`highlight-${ctx.hl.run}`}
      aria-hidden="true"
      className="absolute inset-0 bg-accent"
      style={{ borderRadius: 8 }}
      initial={ctx.hl.moved ? false : { opacity: 0 }}
      animate={{ opacity: ctx.hl.on ? 1 : 0 }}
      transition={reduce ? { duration: 0 } : { ...SETTLE, opacity: { duration: ctx.hl.on ? 0.15 : 0.12 } }}
    />
  );

  if (!hasPanel) {
    return (
      <li {...props} className={cn("flex", className)}>
        <a
          ref={setTrigger}
          href={href}
          data-gliding-menu-top={id}
          aria-current={current ? "page" : undefined}
          onPointerEnter={() => {
            ctx.hoverIn(id);
            if (ctx.active !== null) ctx.close();
          }}
          onFocus={() => ctx.active !== null && ctx.close()}
          onKeyDown={onKeyDown}
          className={topStyles}
        >
          {highlight}
          <span className="relative z-10">{label}</span>
        </a>
      </li>
    );
  }

  return (
    <li {...props} className={cn("flex", className)}>
      <button
        ref={setTrigger}
        type="button"
        data-gliding-menu-top={id}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-current={current ? "page" : undefined}
        onPointerEnter={(event) => {
          ctx.hoverIn(id);
          if (event.pointerType === "mouse") ctx.open(id, "hover");
        }}
        onFocus={() => !ctx.quiet.current && ctx.open(id, "focus")}
        onClick={() => ctx.open(id, "press")}
        onKeyDown={onKeyDown}
        className={topStyles}
      >
        {highlight}
        <span className="relative z-10">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "relative z-10 size-3.5 opacity-60 transition-transform duration-200 ease-settle",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence custom={ctx.dir}>
        {isOpen && (
          <GlidingMenuPanel key="panel" id={panelId} setRef={setContent} dir={ctx.dir} onLinkClick={() => ctx.close()}>
            {children}
          </GlidingMenuPanel>
        )}
      </AnimatePresence>
    </li>
  );
}

function GlidingMenuPanel({
  id,
  setRef,
  dir,
  onLinkClick,
  children,
}: {
  id: string;
  setRef: (el: HTMLDivElement | null) => void;
  dir: number;
  onLinkClick: () => void;
  children: ReactNode;
}) {
  const { frame } = useMenu();
  const reduce = useReducedMotion();
  const self = useRef<HTMLDivElement | null>(null);

  const clip = useTransform(() => {
    const fx = frame.x.get();
    const fw = frame.w.get();
    const fh = frame.h.get();
    const el = self.current;
    if (!el?.dataset.left) return "none";
    const left = Number(el.dataset.left);
    const width = Number(el.dataset.width);
    const height = Number(el.dataset.height);
    const l = Math.max(0, fx - left);
    const r = Math.max(0, left + width - (fx + fw));
    const b = Math.max(0, height - fh);
    return `inset(0px ${r}px ${b}px ${l}px round ${RADIUS}px)`;
  });

  const shift = reduce ? 0 : 10;

  return (
    <motion.div
      ref={(el: HTMLDivElement | null) => {
        self.current = el;
        setRef(el);
      }}
      id={id}
      custom={dir}
      variants={{
        enter: (d: number) => ({ opacity: 0, x: d * shift }),
        show: {
          opacity: 1,
          x: 0,
          transition: { ...(reduce ? { duration: 0.12 } : SETTLE), opacity: { duration: 0.18, delay: 0.04 } },
        },
        leave: (d: number) => ({ opacity: 0, x: -d * shift, transition: { duration: 0.12 } }),
      }}
      initial="enter"
      animate="show"
      exit="leave"
      onClick={(event) => {
        if ((event.target as Element).closest("a")) onLinkClick();
      }}
      className="absolute top-full z-50"
      style={{ paddingTop: GAP, clipPath: clip }}
    >
      <div className="w-max max-w-[calc(100vw-16px)] p-2">{children}</div>
    </motion.div>
  );
}

export interface GlidingMenuLinkProps extends ComponentProps<"a"> {
  href: string;
  description?: ReactNode;
  current?: boolean;
}

export function GlidingMenuLink({ description, current = false, className, children, ...props }: GlidingMenuLinkProps) {
  return (
    <a
      {...props}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm outline-none",
        "transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
    >
      <span className="font-medium text-foreground in-aria-[current=page]:text-brand-strong">{children}</span>
      {description != null && <span className="text-[13px] leading-[18px] text-muted-foreground">{description}</span>}
    </a>
  );
}

export interface GlidingMenuFeatureProps extends Omit<ComponentProps<"a">, "title"> {
  href: string;
  image: string;
  title: ReactNode;
  description?: ReactNode;
}

export function GlidingMenuFeature({ image, title, description, className, ...props }: GlidingMenuFeatureProps) {
  return (
    <a
      {...props}
      className={cn(
        "group/feature flex gap-3 rounded-[10px] p-2 outline-none",
        "transition-colors duration-150 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
    >
      <img src={image} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover ring-1 ring-foreground/[0.06]" />
      <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {description != null && (
          <span className="line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">{description}</span>
        )}
      </span>
    </a>
  );
}

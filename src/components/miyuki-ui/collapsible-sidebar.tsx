"use client";

import { Pin } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type FocusEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const WIDE = "(min-width: 768px)";

const SidebarContext = createContext<{ close: () => void }>({ close: () => {} });

const labelStyles = cn(
  "min-w-0 truncate transition-[opacity,translate] duration-200 ease-settle",
  "md:-translate-x-1.5 md:opacity-0 md:group-data-[expanded]/sidebar:translate-x-0 md:group-data-[expanded]/sidebar:opacity-100",
  "md:group-data-[expanded]/sidebar:delay-75 motion-reduce:translate-x-0",
);

export interface SidebarProps extends Omit<ComponentProps<"aside">, "children"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultPinned?: boolean;
  logo?: ReactNode;
  name?: ReactNode;
  backdropBlur?: boolean;
  children?: ReactNode;
}

export function Sidebar({
  open,
  onOpenChange,
  defaultPinned = false,
  backdropBlur = false,
  logo,
  name,
  className,
  children,
  "aria-label": ariaLabel = "Sidebar",
  ...props
}: SidebarProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const [pinned, setPinned] = useState(defaultPinned);
  const isOpen = open ?? ownOpen;
  const expanded = pinned || isOpen;
  const panelId = useId();
  const groupId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);

  const setOpen = (next: boolean) => {
    window.clearTimeout(timer.current);
    if (next === isOpen) return;
    if (open === undefined) setOwnOpen(next);
    onOpenChange?.(next);
  };
  const later = (next: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), ms);
  };
  const wide = () => window.matchMedia(WIDE).matches;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || wide()) return;
      setOwnOpen(false);
      onOpenChange?.(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onOpenChange]);

  const brand = (
    <>
      <span className="grid size-10 shrink-0 place-items-center">{logo}</span>
      {name != null && (
        <span className={cn(labelStyles, "ps-1.5 text-[15px] font-semibold tracking-[-0.01em]")}>{name}</span>
      )}
    </>
  );

  return (
    <aside
      {...props}
      aria-label={ariaLabel}
      data-expanded={expanded || undefined}
      data-open={isOpen || undefined}
      data-pinned={pinned || undefined}
      className={cn(
        "group/sidebar relative z-40 shrink-0 text-foreground",
        "md:h-full md:w-[60px] md:transition-[width] md:duration-300 md:ease-settle md:data-[pinned]:w-[280px] motion-reduce:transition-none",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-1 border-b border-border bg-card px-2 md:hidden">
        <button
          ref={menuButton}
          type="button"
          aria-label="Menu"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpen(!isOpen)}
          className={cn(
            "grid size-10 shrink-0 cursor-default place-items-center rounded-lg outline-none",
            "transition-[background-color,transform,box-shadow] duration-150 ease-settle hover:bg-accent active:scale-[0.96]",
            "focus-visible:ring-[3px] focus-visible:ring-ring",
          )}
        >
          <MorphIcon shapes={morphIcons.menuClose} shape={isOpen ? "close" : "menu"} size={20} />
        </button>
        <div className="flex min-w-0 items-center">{brand}</div>
      </div>

      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "absolute top-full left-0 h-[calc(100dvh-100%)] w-screen bg-foreground/25 dark:bg-background/60 md:hidden",
          backdropBlur && "backdrop-blur-sm",
          "transition-[opacity,visibility] duration-200 ease-out",
          isOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      />

      <div
        ref={panel}
        id={panelId}
        onPointerEnter={(event) => event.pointerType === "mouse" && wide() && later(true, 60)}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse" || !wide()) return;
          if (panel.current?.contains(document.activeElement) && document.activeElement?.matches(":focus-visible"))
            return;
          later(false, 140);
        }}
        onFocus={(event: FocusEvent<HTMLDivElement>) => {
          if (wide() && (event.target as HTMLElement).matches(":focus-visible")) setOpen(true);
        }}
        onBlur={(event: FocusEvent<HTMLDivElement>) => {
          if (!wide() || panel.current?.contains(event.relatedTarget as Node)) return;
          if (!panel.current?.matches(":hover")) setOpen(false);
        }}
        className={cn(
          "absolute left-0 flex flex-col overflow-hidden border-border bg-card",
          "max-md:top-full max-md:h-[calc(100dvh-100%)] max-md:w-[min(280px,calc(100vw-48px))] max-md:border-r max-md:shadow-xl",
          "max-md:transition-[translate,visibility] max-md:duration-300 max-md:ease-settle",
          isOpen ? "max-md:visible max-md:translate-x-0" : "max-md:invisible max-md:-translate-x-full",
          "md:inset-y-0 md:w-[60px] md:border-r md:transition-[width,box-shadow] md:duration-300 md:ease-settle",
          "md:group-data-[expanded]/sidebar:w-[280px]",
          isOpen && !pinned && "md:shadow-lg",
          "motion-reduce:transition-none",
        )}
      >
        <div className="hidden h-14 shrink-0 items-center gap-1 px-2.5 md:flex">
          <div className="flex min-w-0 flex-1 items-center">{brand}</div>
          <button
            type="button"
            aria-label="Keep sidebar open"
            aria-pressed={pinned}
            onClick={() => setPinned((p) => !p)}
            className={cn(
              "grid size-8 shrink-0 cursor-default place-items-center rounded-md text-muted-foreground outline-none",
              "transition-[opacity,background-color,color,box-shadow] duration-200 ease-settle",
              "opacity-0 group-data-[expanded]/sidebar:opacity-100 hover:bg-accent hover:text-foreground",
              "aria-pressed:bg-brand-soft aria-pressed:text-brand-strong",
              "focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring",
            )}
          >
            <Pin
              aria-hidden="true"
              className={cn("size-4 transition-transform duration-300 ease-settle", !pinned && "rotate-45")}
              fill={pinned ? "currentColor" : "none"}
              fillOpacity={0.2}
            />
          </button>
        </div>
        <SidebarContext value={{ close: () => !wide() && setOpen(false) }}>
          <LayoutGroup id={groupId}>{children}</LayoutGroup>
        </SidebarContext>
      </div>
    </aside>
  );
}

export interface SidebarBodyProps extends ComponentProps<"nav"> {
  children?: ReactNode;
}

export function SidebarBody({ className, "aria-label": ariaLabel = "Main", ...props }: SidebarBodyProps) {
  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      className={cn("flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto py-2", className)}
    />
  );
}

export interface SidebarLinkProps extends Omit<ComponentProps<"a">, "children"> {
  href: string;
  icon: ReactNode;
  label: ReactNode;
  current?: boolean;
}

export function SidebarLink({ href, icon, label, current = false, className, onClick, ...props }: SidebarLinkProps) {
  const { close } = useContext(SidebarContext);
  const reduce = useReducedMotion();
  return (
    <a
      {...props}
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={(event) => {
        onClick?.(event);
        close();
      }}
      className={cn(
        "relative mx-2.5 flex h-10 shrink-0 items-center rounded-lg pe-3 text-sm font-medium whitespace-nowrap outline-none select-none",
        "text-muted-foreground transition-[background-color,color,box-shadow] duration-150 ease-settle",
        "hover:bg-accent hover:text-foreground aria-[current=page]:text-foreground",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      {current && (
        <motion.span
          layoutId="current"
          aria-hidden="true"
          className="absolute top-2.5 -left-2.5 h-5 w-[3px] bg-brand"
          style={{ borderTopRightRadius: 3, borderBottomRightRadius: 3 }}
          transition={reduce ? { duration: 0 } : SETTLE}
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center transition-colors duration-150 [&_svg]:size-[18px]",
          current && "text-brand-strong",
        )}
      >
        {icon}
      </span>
      <span className={labelStyles}>{label}</span>
    </a>
  );
}

export interface SidebarFooterProps extends Omit<ComponentProps<"div">, "children"> {
  avatar?: ReactNode;
  name?: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
}

export function SidebarFooter({ avatar, name, detail, className, children, ...props }: SidebarFooterProps) {
  return (
    <div {...props} className={cn("shrink-0 border-t border-border px-2.5 py-2.5", className)}>
      <div className="flex h-11 items-center">
        <span className="grid size-10 shrink-0 place-items-center">
          {typeof avatar === "string" ? (
            <img src={avatar} alt="" className="size-8 rounded-full object-cover ring-1 ring-foreground/10" />
          ) : (
            avatar
          )}
        </span>
        <span className={cn(labelStyles, "flex min-w-0 flex-1 flex-col ps-1.5")}>
          {name != null && <span className="truncate text-sm leading-5 font-medium">{name}</span>}
          {detail != null && <span className="truncate text-xs leading-4 text-muted-foreground">{detail}</span>}
        </span>
        {children != null && <span className={cn(labelStyles, "flex shrink-0 items-center")}>{children}</span>}
      </div>
    </div>
  );
}

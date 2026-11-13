"use client";

import { Check, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, useSpring } from "motion/react";
import {
  type ComponentProps,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Menu, MenuItem } from "react-aria-components";
import { cn } from "@/lib/utils";

export interface ControlIslandOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface ControlIslandItem {
  id: string;
  label: string;
  icon?: ReactNode;
  options: ControlIslandOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export interface ControlIslandProps extends Omit<ComponentProps<"div">, "children"> {
  items: ControlIslandItem[];
  position?: "top" | "bottom";
  align?: "start" | "center" | "end";
  closeOnSelect?: boolean;
  showSelectedValue?: boolean;
  showDividers?: boolean;
  offset?: number;
  contained?: boolean;
  onItemChange?: (id: string | null) => void;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const RADIUS = 22;
const BORDER = 2;

const justify = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;

interface Highlight {
  id: string | null;
  on: boolean;
  moved: boolean;
  run: number;
}

function useHighlight() {
  const [hl, setHl] = useState<Highlight>({ id: null, on: false, moved: false, run: 0 });
  const enter = (id: string) =>
    setHl((h) => (h.on ? { ...h, id, moved: h.id !== id || h.moved } : { id, on: true, moved: false, run: h.run + 1 }));
  const leave = (id?: string) => setHl((h) => (id === undefined || h.id === id ? { ...h, on: false } : h));
  const reset = () => setHl((h) => ({ ...h, id: null, on: false }));
  return { hl, enter, leave, reset };
}

export function ControlIsland({
  items,
  position = "bottom",
  align = "center",
  closeOnSelect = true,
  showSelectedValue = true,
  showDividers = true,
  offset = 16,
  contained = false,
  onItemChange,
  className,
  style,
  "aria-label": ariaLabel = "Controls",
  ...props
}: ControlIslandProps) {
  const reduce = useReducedMotion();
  const groupId = useId();
  const menuId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const [own, setOwn] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.defaultValue])),
  );
  const { hl, enter: hoverIn, leave: hoverOut, reset: hoverReset } = useHighlight();
  const [width, setWidth] = useState(0);
  const surface = useRef<HTMLDivElement>(null);
  const w = useSpring(0, SETTLE);
  const h = useSpring(0, SETTLE);
  const sized = useRef(false);
  const still = useRef(false);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);

  useEffect(() => {
    still.current = reduce === true;
  }, [reduce]);

  const measure = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const read = () => {
        const nw = el.offsetWidth + BORDER;
        const nh = el.offsetHeight + BORDER;
        if (!sized.current || still.current) {
          w.jump(nw);
          h.jump(nh);
          sized.current = true;
        } else {
          w.set(nw);
          h.set(nh);
        }
      };
      read();
      const observer = new ResizeObserver(read);
      observer.observe(el);
      return () => observer.disconnect();
    },
    [w, h],
  );

  const valueOf = (item: ControlIslandItem) => item.value ?? own[item.id];
  const current = items.find((item) => item.id === openId) ?? null;

  const show = (id: string | null, returnFocus = false) => {
    if (id === null && returnFocus) refocus.current = openId;
    if (id !== null && openId === null) setWidth(surface.current?.offsetWidth ?? 0);
    setOpenId(id);
    hoverReset();
    if (id !== openId) onItemChange?.(id);
  };

  useEffect(() => {
    if (openId !== null || refocus.current === null) return;
    triggers.current.get(refocus.current)?.focus({ preventScroll: true });
    refocus.current = null;
  }, [openId]);

  useEffect(() => {
    if (openId === null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      refocus.current = openId;
      setOpenId(null);
      onItemChange?.(null);
    };
    const onPointer = (event: PointerEvent) => {
      if (surface.current?.contains(event.target as Node)) return;
      setOpenId(null);
      onItemChange?.(null);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openId, onItemChange]);

  const choose = (item: ControlIslandItem, value: string) => {
    if (item.value === undefined) setOwn((v) => ({ ...v, [item.id]: value }));
    if (valueOf(item) !== value) item.onChange?.(value);
    if (closeOnSelect) show(null, true);
  };

  const step = (from: string, by: number) => {
    const i = items.findIndex((item) => item.id === from);
    return items[(i + by + items.length) % items.length];
  };

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>, item: ControlIslandItem) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const next = step(item.id, event.key === "ArrowRight" ? 1 : -1);
      triggers.current.get(next.id)?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show(item.id);
    }
  };

  const enter = position === "top" ? -8 : 8;
  const fadeIn = { duration: 0.16, delay: reduce ? 0 : 0.04 };
  const fadeOut = { duration: 0.08 };
  const anchor = position === "top" ? "top-0" : "bottom-0";

  return (
    <div
      {...props}
      role="group"
      aria-label={ariaLabel}
      className={cn(
        contained ? "absolute" : "fixed",
        "pointer-events-none inset-x-0 z-50 flex",
        position === "top" ? "items-start" : "items-end",
        justify[align],
        className,
      )}
      style={{ [position]: offset, paddingInline: offset, ...style }}
    >
      <motion.div
        ref={surface}
        initial={{ opacity: 0, y: reduce ? 0 : enter }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0.15 } : SETTLE}
        onBlur={(event) => {
          if (openId === null || surface.current?.contains(event.relatedTarget as Node | null)) return;
          if (event.relatedTarget === null) return;
          setOpenId(null);
          onItemChange?.(null);
        }}
        className={cn(
          "pointer-events-auto relative max-w-full overflow-hidden border border-border bg-card/70 text-foreground backdrop-blur-xl",
          "shadow-md",
        )}
        style={{ width: w, height: h, borderRadius: RADIUS }}
      >
        <AnimatePresence initial={false}>
          {current ? (
            <motion.div
              key={`panel-${current.id}`}
              ref={measure}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: fadeIn }}
              exit={{ opacity: 0, transition: fadeOut }}
              className={cn("absolute left-0 w-72 p-2", anchor)}
              style={{ minWidth: width ? Math.min(width - BORDER, 420) : undefined }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                show(step(current.id, event.key === "ArrowRight" ? 1 : -1).id);
              }}
            >
              <div className="flex h-9 items-center gap-2 ps-2.5 pe-0.5 text-[13px] font-medium text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
                {current.icon != null && (
                  <span aria-hidden="true" className="flex">
                    {current.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{current.label}</span>
                <button
                  type="button"
                  aria-label={`Close ${current.label}`}
                  aria-expanded="true"
                  aria-controls={menuId}
                  onClick={() => show(null, true)}
                  className={cn(
                    "grid size-8 shrink-0 cursor-default place-items-center rounded-full text-muted-foreground outline-none",
                    "transition-[background-color,color,box-shadow] duration-150 hover:bg-accent hover:text-foreground",
                    "focus-visible:ring-[3px] focus-visible:ring-ring",
                  )}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
              <LayoutGroup id={`${groupId}-options`}>
                <Menu
                  id={menuId}
                  aria-label={current.label}
                  autoFocus
                  shouldFocusWrap
                  escapeKeyBehavior="none"
                  selectionMode="single"
                  selectedKeys={valueOf(current) ? [valueOf(current) as string] : []}
                  onAction={(key) => choose(current, String(key))}
                  className="flex flex-col gap-0.5 outline-none"
                >
                  {current.options.map((option) => (
                    <MenuItem
                      key={option.id}
                      id={option.id}
                      textValue={option.label}
                      className={cn(
                        "relative flex h-10 cursor-default items-center gap-2.5 rounded-[14px] px-3 text-sm outline-none select-none",
                        "text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
                        "data-[focus-visible]:ring-1 data-[focus-visible]:ring-ring data-[focus-visible]:ring-inset",
                      )}
                    >
                      {({ isFocused, isSelected }) => (
                        <>
                          {isFocused && (
                            <motion.span
                              layoutId="option"
                              layoutDependency={option.id}
                              aria-hidden="true"
                              className="absolute inset-0 bg-accent"
                              style={{ borderRadius: 14 }}
                              transition={reduce ? { duration: 0 } : SETTLE}
                            />
                          )}
                          {option.icon != null && (
                            <span aria-hidden="true" className="relative z-10 flex text-muted-foreground">
                              {option.icon}
                            </span>
                          )}
                          <span className={cn("relative z-10 min-w-0 flex-1 truncate", isSelected && "font-medium")}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <Check aria-hidden="true" className="relative z-10 text-brand" strokeWidth={2.25} />
                          )}
                        </>
                      )}
                    </MenuItem>
                  ))}
                </Menu>
              </LayoutGroup>
            </motion.div>
          ) : (
            <motion.div
              key="bar"
              ref={measure}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: fadeIn }}
              exit={{ opacity: 0, transition: fadeOut }}
              className={cn("absolute left-0 flex h-11 w-max items-center px-1", anchor)}
              onPointerLeave={() => hoverOut()}
            >
              <LayoutGroup id={`${groupId}-triggers`}>
                {items.map((item, i) => {
                  const value = valueOf(item);
                  const shown = showSelectedValue ? item.options.find((o) => o.id === value)?.label : undefined;
                  return (
                    <Fragment key={item.id}>
                      {i > 0 && showDividers && (
                        <span
                          aria-hidden="true"
                          className="mx-0.5 h-4 w-0.5 shrink-0 bg-[radial-gradient(circle,currentColor_0.8px,transparent_1.1px)] bg-[length:2px_4px] text-foreground/30"
                        />
                      )}
                      <button
                        ref={(el) => {
                          if (el) triggers.current.set(item.id, el);
                          else triggers.current.delete(item.id);
                        }}
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded="false"
                        onClick={() => show(item.id)}
                        onKeyDown={(event) => onTriggerKey(event, item)}
                        onPointerEnter={() => hoverIn(item.id)}
                        className={cn(
                          "relative flex h-9 shrink-0 cursor-default items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap outline-none select-none",
                          "transition-[box-shadow] duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
                          "[&_svg]:size-4 [&_svg]:shrink-0",
                        )}
                      >
                        {hl.id === item.id && (
                          <motion.span
                            layoutId={`trigger-${hl.run}`}
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
                        {item.icon != null && (
                          <span aria-hidden="true" className="relative z-10 flex text-muted-foreground">
                            {item.icon}
                          </span>
                        )}
                        <span
                          className={cn("relative z-10 font-medium", shown && item.icon != null && "max-sm:sr-only")}
                        >
                          {item.label}
                        </span>
                        {shown && (
                          <span
                            className={cn(
                              "relative z-10 text-muted-foreground",
                              item.icon != null && "max-sm:text-foreground",
                            )}
                          >
                            {shown}
                          </span>
                        )}
                      </button>
                    </Fragment>
                  );
                })}
              </LayoutGroup>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

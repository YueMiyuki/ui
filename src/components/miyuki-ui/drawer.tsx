"use client";

import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  Modal as AriaModal,
  Dialog,
  type DialogRenderProps,
  DialogTrigger,
  type DialogTriggerProps,
  Heading,
  type HeadingProps,
  ModalOverlay,
  type ModalOverlayProps,
  OverlayTriggerStateContext,
} from "react-aria-components";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type DrawerSide = "right" | "left" | "top" | "bottom";

const keyframes = `
@keyframes miyuki-drawer-in { from { transform: var(--miyuki-drawer-from); } }
@keyframes miyuki-drawer-out { to { transform: var(--miyuki-drawer-from); } }
@keyframes miyuki-drawer-fade-in { from { opacity: 0; } }
@keyframes miyuki-drawer-fade-out { to { opacity: 0; } }
`;

const SETTLE = "cubic-bezier(0.22, 1, 0.36, 1)";

const sides: Record<DrawerSide, { panel: string; from: string }> = {
  right: {
    panel: "top-2 right-2 bottom-2 w-[380px] max-w-[calc(100%-16px)] rounded-2xl",
    from: "translate3d(calc(100% + 8px), 0, 0)",
  },
  left: {
    panel: "top-2 bottom-2 left-2 w-[380px] max-w-[calc(100%-16px)] rounded-2xl",
    from: "translate3d(calc(-100% - 8px), 0, 0)",
  },
  top: {
    panel: "top-2 right-2 left-2 mx-auto max-h-[calc(100%-16px)] max-w-[640px] rounded-2xl",
    from: "translate3d(0, calc(-100% - 8px), 0)",
  },
  bottom: {
    panel:
      "right-0 bottom-0 left-0 mx-auto max-h-[calc(100%-40px)] w-full max-w-[640px] rounded-t-2xl border-b-0 pb-[env(safe-area-inset-bottom)]",
    from: "translate3d(0, 100%, 0)",
  },
};

const DrawerContext = createContext<{ side: DrawerSide; closeButton: boolean }>({
  side: "right",
  closeButton: false,
});

const NO_DRAG = "button, a, input, textarea, select, label, [role=menuitem], [contenteditable], [data-drawer-no-drag]";

interface Drag {
  pointer: number;
  startY: number;
  offset: number;
  velocity: number;
  time: number;
  active: boolean;
}

function useSheetDrag(enabled: boolean, forwardedRef?: Ref<HTMLDivElement>) {
  const state = useContext(OverlayTriggerStateContext);
  const panel = useRef<HTMLDivElement | null>(null);
  const scrim = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const panelRef = useCallback(
    (el: HTMLDivElement | null) => {
      panel.current = el;
      assignRef(forwardedRef, el);
    },
    [forwardedRef],
  );

  const settleBack = () => {
    const el = panel.current;
    const shade = scrim.current;
    if (el) {
      el.style.transition = `transform 320ms ${SETTLE}`;
      el.style.transform = "";
    }
    if (shade) {
      shade.style.transition = `opacity 320ms ${SETTLE}`;
      shade.style.opacity = "";
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || !event.isPrimary || event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest(NO_DRAG)) return;
    const body = target.closest("[data-drawer-body]");
    if (body && body.scrollTop > 0) return;
    drag.current = {
      pointer: event.pointerId,
      startY: event.clientY,
      offset: 0,
      velocity: 0,
      time: event.timeStamp,
      active: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = panel.current;
    if (!d || !el || event.pointerId !== d.pointer) return;
    const dy = event.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < 5) return;
      d.active = true;
      el.setPointerCapture(event.pointerId);
      el.style.transition = "none";
      if (scrim.current) scrim.current.style.transition = "none";
    }
    const offset = dy >= 0 ? dy : -Math.min(14, Math.sqrt(-dy) * 1.6);
    const dt = Math.max(1, event.timeStamp - d.time);
    d.velocity = d.velocity * 0.4 + ((offset - d.offset) / dt) * 0.6;
    d.offset = offset;
    d.time = event.timeStamp;
    el.style.transform = `translate3d(0, ${offset}px, 0)`;
    if (scrim.current) {
      const progress = Math.max(0, offset) / Math.max(1, el.offsetHeight);
      scrim.current.style.opacity = String(1 - progress * 0.9);
    }
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.pointer) return;
    drag.current = null;
    if (!d.active) return;
    const el = panel.current;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    const height = el?.offsetHeight ?? 0;
    const far = d.offset > Math.min(height * 0.35, 220);
    const flung = d.velocity > 0.55 && d.offset > 24;
    if (!cancelled && (far || flung) && state) {
      state.close();
    } else {
      settleBack();
    }
  };

  const handlers = enabled
    ? {
        onPointerDown,
        onPointerMove,
        onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => finish(event, false),
        onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => finish(event, true),
      }
    : {};
  return { panelRef, scrim, handlers };
}

export function DrawerTrigger(props: DialogTriggerProps) {
  return <DialogTrigger {...props} />;
}

export interface DrawerProps extends Omit<ModalOverlayProps, "children" | "className" | "style" | "render"> {
  side?: DrawerSide;
  isDismissable?: boolean;
  closeButton?: boolean;
  "aria-label"?: string;
  className?: string;
  overlayClassName?: string;
  backdropBlur?: boolean;
  children?: ReactNode | ((opts: DialogRenderProps) => ReactNode);
  ref?: Ref<HTMLDivElement>;
}

export function Drawer({
  side = "right",
  isDismissable = true,
  closeButton,
  "aria-label": ariaLabel,
  className,
  overlayClassName,
  backdropBlur = false,
  children,
  ref,
  ...props
}: DrawerProps) {
  return (
    <>
      <style href="miyuki-drawer" precedence="miyuki">
        {keyframes}
      </style>
      <ModalOverlay
        {...props}
        isDismissable={isDismissable}
        className={cn("group/drawer fixed top-0 left-0 z-50 h-(--visual-viewport-height) w-full", overlayClassName)}
      >
        <DrawerPanel
          side={side}
          closeButton={closeButton ?? side !== "bottom"}
          ariaLabel={ariaLabel}
          className={className}
          backdropBlur={backdropBlur}
          panelRef={ref}
        >
          {children}
        </DrawerPanel>
      </ModalOverlay>
    </>
  );
}

interface DrawerPanelProps {
  side: DrawerSide;
  closeButton: boolean;
  ariaLabel?: string;
  className?: string;
  backdropBlur: boolean;
  panelRef?: Ref<HTMLDivElement>;
  children?: DrawerProps["children"];
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as RefObject<T | null>).current = value;
}

function DrawerPanel({ side, closeButton, ariaLabel, className, backdropBlur, panelRef, children }: DrawerPanelProps) {
  const sheet = side === "bottom";
  const { panelRef: setPanel, scrim, handlers: dragProps } = useSheetDrag(sheet, panelRef);

  return (
    <>
      <div
        ref={scrim}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-foreground/25 dark:bg-background/60",
          backdropBlur && "backdrop-blur-sm",
          "animate-[miyuki-drawer-fade-in_240ms_ease-out]",
          "group-data-[exiting]/drawer:animate-[miyuki-drawer-fade-out_180ms_ease-in_forwards]",
        )}
      />
      <AriaModal
        ref={setPanel}
        {...dragProps}
        style={{ "--miyuki-drawer-from": sides[side].from } as CSSProperties}
        className={cn(
          "absolute flex flex-col border border-border bg-popover text-popover-foreground shadow-xl outline-none",
          sides[side].panel,
          "data-[entering]:animate-[miyuki-drawer-in_320ms_cubic-bezier(0.22,1,0.36,1)]",
          "data-[exiting]:animate-[miyuki-drawer-out_180ms_cubic-bezier(0.4,0,1,1)_forwards]",
          "motion-reduce:data-[entering]:animate-[miyuki-drawer-fade-in_120ms_ease-out]",
          "motion-reduce:data-[exiting]:animate-[miyuki-drawer-fade-out_100ms_ease-in_forwards]",
          sheet &&
            "after:pointer-events-none after:absolute after:inset-x-[-1px] after:top-full after:h-6 after:border-x after:border-border after:bg-popover",
          className,
        )}
      >
        {sheet && (
          <div
            aria-hidden="true"
            className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1 active:cursor-grabbing"
          >
            <span className="h-1 w-10 rounded-full bg-border-strong" />
          </div>
        )}
        <Dialog
          aria-label={ariaLabel}
          render={(domProps) => <section {...domProps} role={domProps.role ?? "dialog"} aria-modal="true" />}
          className="relative flex min-h-0 flex-auto flex-col outline-none"
        >
          {(renderProps) => (
            <DrawerContext value={{ side, closeButton }}>
              {typeof children === "function" ? children(renderProps) : children}
              {closeButton && <CloseButton slot="close" size="lg" className="absolute top-4 right-3" />}
            </DrawerContext>
          )}
        </Dialog>
      </AriaModal>
    </>
  );
}

export type DrawerHeaderProps = ComponentProps<"div">;

export function DrawerHeader({ className, ...props }: DrawerHeaderProps) {
  const { side } = useContext(DrawerContext);
  return (
    <div
      {...props}
      className={cn(
        "flex shrink-0 flex-col gap-1 px-5 pb-3",
        side === "bottom" ? "touch-none pt-2" : "pt-5",
        className,
      )}
    />
  );
}

export type DrawerTitleProps = HeadingProps;

export function DrawerTitle({ className, ...props }: DrawerTitleProps) {
  const { closeButton } = useContext(DrawerContext);
  return (
    <Heading
      slot="title"
      {...props}
      className={cn(
        "text-base leading-6 font-semibold tracking-[-0.005em] text-foreground",
        closeButton && "pe-9",
        className,
      )}
    />
  );
}

export type DrawerBodyProps = ComponentProps<"div">;

export function DrawerBody({ className, ref, ...props }: DrawerBodyProps) {
  const inner = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      inner.current = el;
      assignRef(ref, el);
    },
    [ref],
  );

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const update = () => {
      const rest = el.scrollHeight - el.clientHeight - el.scrollTop;
      el.toggleAttribute("data-overflow-top", el.scrollTop > 0.5);
      el.toggleAttribute("data-overflow-bottom", rest > 0.5);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={setRefs}
      data-drawer-body=""
      {...props}
      className={cn(
        "min-h-0 flex-auto overflow-y-auto overscroll-contain border-y border-transparent px-5 py-2 text-sm text-foreground",
        "transition-[border-color] duration-150 ease-out",
        "data-[overflow-top]:border-t-border data-[overflow-bottom]:border-b-border",
        className,
      )}
    />
  );
}

export type DrawerFooterProps = ComponentProps<"div">;

export function DrawerFooter({ className, ...props }: DrawerFooterProps) {
  return (
    <div
      {...props}
      className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2 px-5 pt-3 pb-5", className)}
    />
  );
}

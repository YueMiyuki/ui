"use client";

import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Key,
  OverlayTriggerStateContext,
  PopoverContext,
  Provider,
  type RootMenuTriggerState,
  RootMenuTriggerStateContext,
  useLocale,
} from "react-aria-components";
import { createPortal } from "react-dom";
import {
  DropdownItem,
  type DropdownItemProps,
  DropdownMenu,
  DropdownSection,
  type DropdownSectionProps,
  DropdownSeparator,
  type DropdownSeparatorProps,
  DropdownSubmenu,
} from "@/components/miyuki-ui/dropdown";
import { cn } from "@/lib/utils";

type FocusStrategy = RootMenuTriggerState["focusStrategy"];

const LONG_PRESS_MS = 520;

function useContextMenuState(onOpenChange?: (isOpen: boolean) => void): RootMenuTriggerState {
  const [isOpen, setIsOpen] = useState(false);
  const [focusStrategy, setFocusStrategy] = useState<FocusStrategy>(null);
  const [stack, setStack] = useState<Key[]>([]);

  return useMemo(() => {
    const setOpen = (next: boolean) => {
      if (!next) setStack([]);
      setIsOpen(next);
      if (next !== isOpen) onOpenChange?.(next);
    };
    return {
      isOpen,
      focusStrategy,
      expandedKeysStack: stack,
      point: null,
      setPoint() {},
      setOpen,
      open(strategy: FocusStrategy = null) {
        setFocusStrategy(strategy);
        setOpen(true);
      },
      close() {
        setOpen(false);
      },
      toggle(strategy: FocusStrategy = null) {
        setFocusStrategy(strategy);
        setOpen(!isOpen);
      },
      openSubmenu(key: Key, level: number) {
        setStack((old) => (level > old.length ? old : [...old.slice(0, level), key]));
      },
      closeSubmenu(key: Key, level: number) {
        setStack((old) => (old[level] === key ? old.slice(0, level) : old));
      },
    };
  }, [isOpen, focusStrategy, stack, onOpenChange]);
}

const ActionContext = createContext<((key: Key) => void) | undefined>(undefined);

export interface ContextMenuProps extends Omit<ComponentProps<"div">, "children" | "aria-label"> {
  children: ReactNode;
  menu: ReactNode;
  "aria-label"?: string;
  onAction?: (key: Key) => void;
  onOpenChange?: (isOpen: boolean) => void;
  isDisabled?: boolean;
  disabledKeys?: Iterable<Key>;
  menuClassName?: string;
}

export function ContextMenu({
  children,
  menu,
  "aria-label": ariaLabel = "Context menu",
  onAction,
  onOpenChange,
  isDisabled = false,
  disabledKeys,
  menuClassName,
  className,
  onContextMenu,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ref,
  ...props
}: ContextMenuProps) {
  const state = useContextMenuState(onOpenChange);
  const { direction } = useLocale();
  const [point, setPoint] = useState<{ x: number; y: number; key: number } | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const keyboardAt = useRef(-Infinity);
  const press = useRef<{ x: number; y: number; timer: number } | null>(null);

  const openAt = (x: number, y: number, strategy: FocusStrategy) => {
    setPoint((old) => ({ x, y, key: (old?.key ?? 0) + 1 }));
    state.open(strategy);
  };

  const { isOpen, close } = state;
  const openRef = useRef(openAt);
  useEffect(() => {
    openRef.current = openAt;
  });

  useEffect(() => {
    if (!isOpen) return;
    function onDocumentContextMenu(event: globalThis.MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest?.("[data-trigger=ContextMenu], [data-trigger=SubmenuTrigger]")) {
        event.preventDefault();
        return;
      }
      const rect = areaRef.current?.getBoundingClientRect();
      const inside =
        rect != null &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (inside) {
        event.preventDefault();
        openRef.current(event.clientX, event.clientY, null);
      } else {
        close();
      }
    }
    document.addEventListener("contextmenu", onDocumentContextMenu, true);
    return () => document.removeEventListener("contextmenu", onDocumentContextMenu, true);
  }, [isOpen, close]);

  useEffect(() => () => window.clearTimeout(press.current?.timer), []);

  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const setAreaRef = (el: HTMLDivElement | null) => {
    areaRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <>
      <div
        {...props}
        ref={setAreaRef}
        data-open={isOpen || undefined}
        className={cn("[-webkit-touch-callout:none]", className)}
        onContextMenu={(event: MouseEvent<HTMLDivElement>) => {
          onContextMenu?.(event);
          if (isDisabled || event.defaultPrevented) return;
          event.preventDefault();
          cancelPress();
          if (performance.now() - keyboardAt.current < 500) return;
          openAt(event.clientX, event.clientY, null);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
          if (isDisabled || event.defaultPrevented) return;
          if ((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu") {
            event.preventDefault();
            keyboardAt.current = performance.now();
            const rect = (event.target as Element).getBoundingClientRect();
            openAt(direction === "rtl" ? rect.right : rect.left, rect.bottom, "first");
          }
        }}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          onPointerDown?.(event);
          if (isDisabled || event.pointerType !== "touch") return;
          cancelPress();
          const { clientX: x, clientY: y } = event;
          press.current = {
            x,
            y,
            timer: window.setTimeout(() => {
              press.current = null;
              openAt(x, y, null);
            }, LONG_PRESS_MS),
          };
        }}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          onPointerMove?.(event);
          const start = press.current;
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancelPress();
        }}
        onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
          onPointerUp?.(event);
          cancelPress();
        }}
        onPointerCancel={(event: PointerEvent<HTMLDivElement>) => {
          onPointerCancel?.(event);
          cancelPress();
        }}
      >
        {children}
      </div>
      {point != null &&
        createPortal(
          <span
            ref={anchorRef}
            aria-hidden="true"
            style={{ position: "fixed", left: point.x, top: point.y, width: 0, height: 0, pointerEvents: "none" }}
          />,
          document.body,
        )}
      {point != null && (
        <Provider
          values={[
            [OverlayTriggerStateContext, state],
            [RootMenuTriggerStateContext, state],
            [PopoverContext, { trigger: "ContextMenu", triggerRef: anchorRef, placement: "bottom start" }],
          ]}
        >
          <ActionContext value={onAction}>
            <DropdownMenu
              key={point.key}
              aria-label={ariaLabel}
              autoFocus={state.focusStrategy ?? true}
              onAction={onAction}
              onClose={close}
              disabledKeys={disabledKeys}
              offset={2}
              popoverClassName={menuClassName}
            >
              {menu}
            </DropdownMenu>
          </ActionContext>
        </Provider>
      )}
    </>
  );
}

export type ContextMenuItemProps<T = object> = DropdownItemProps<T>;

export function ContextMenuItem<T extends object>(props: ContextMenuItemProps<T>) {
  return <DropdownItem {...props} />;
}

export type ContextMenuSectionProps<T> = DropdownSectionProps<T>;

export function ContextMenuSection<T extends object>(props: ContextMenuSectionProps<T>) {
  return <DropdownSection {...props} />;
}

export type ContextMenuSeparatorProps = DropdownSeparatorProps;

export function ContextMenuSeparator(props: ContextMenuSeparatorProps) {
  return <DropdownSeparator {...props} />;
}

export interface ContextMenuSubmenuProps {
  label: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  id?: Key;
  textValue?: string;
  isDisabled?: boolean;
  delay?: number;
  "aria-label"?: string;
  menuClassName?: string;
}

export function ContextMenuSubmenu({
  label,
  children,
  icon,
  id,
  textValue,
  isDisabled,
  delay,
  "aria-label": ariaLabel,
  menuClassName,
}: ContextMenuSubmenuProps) {
  const onAction = useContext(ActionContext);
  const text = textValue ?? (typeof label === "string" ? label : undefined);
  return (
    <DropdownSubmenu delay={delay}>
      <DropdownItem id={id} icon={icon} textValue={text} isDisabled={isDisabled}>
        {label}
      </DropdownItem>
      <DropdownMenu aria-label={ariaLabel ?? text} onAction={onAction} popoverClassName={menuClassName}>
        {children}
      </DropdownMenu>
    </DropdownSubmenu>
  );
}

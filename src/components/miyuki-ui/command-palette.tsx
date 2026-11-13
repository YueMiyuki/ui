"use client";

import { Search, SearchX } from "lucide-react";
import { type ReactNode, type Ref, useContext, useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  composeRenderProps,
  Dialog,
  Header,
  Input,
  type Key,
  Keyboard,
  Menu,
  MenuItem,
  type MenuItemProps,
  MenuSection,
  type MenuSectionProps,
  Modal,
  ModalOverlay,
  OverlayTriggerStateContext,
  SearchField,
  Text,
  useFilter,
} from "react-aria-components";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

const keyframes = `
@keyframes miyuki-command-palette-fade-in { from { opacity: 0; } }
@keyframes miyuki-command-palette-fade-out { to { opacity: 0; } }
@keyframes miyuki-command-palette-rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
@keyframes miyuki-command-palette-sink { to { opacity: 0; transform: scale(0.985); } }
`;

const kbd =
  "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-muted px-1 font-mono text-xs leading-none text-muted-foreground";

export interface CommandPalettePanelProps {
  children?: ReactNode;
  onAction?: (key: Key) => void;
  placeholder?: string;
  emptyState?: ReactNode | ((query: string) => ReactNode);
  inputValue?: string;
  defaultInputValue?: string;
  onInputChange?: (value: string) => void;
  autoFocus?: boolean;
  "aria-label"?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

interface BodyProps extends CommandPalettePanelProps {
  onClose?: () => void;
}

function Hint({ keys, children, className }: { keys: string[]; children: ReactNode; className?: string }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className="flex gap-0.5" aria-hidden="true">
        {keys.map((key) => (
          <kbd key={key} className={kbd}>
            {key}
          </kbd>
        ))}
      </span>
      {children}
    </span>
  );
}

function DefaultEmpty({ query }: { query: string }) {
  return (
    <>
      <SearchX aria-hidden="true" className="mb-1 size-5 text-muted-foreground" strokeWidth={1.75} />
      <p className="max-w-full truncate text-sm font-medium text-foreground">No results for “{query.trim()}”</p>
      <p className="text-[13px] text-muted-foreground">Try another word, or check the spelling.</p>
    </>
  );
}

function PaletteBody({
  children,
  onAction,
  onClose,
  placeholder = "Search pages and actions…",
  emptyState,
  inputValue,
  defaultInputValue = "",
  onInputChange,
  autoFocus,
  "aria-label": ariaLabel = "Commands",
}: BodyProps) {
  const [own, setOwn] = useState(defaultInputValue);
  const query = inputValue ?? own;
  const { contains } = useFilter({ sensitivity: "base" });

  return (
    <Autocomplete
      inputValue={query}
      onInputChange={(value) => {
        if (inputValue === undefined) setOwn(value);
        onInputChange?.(value);
      }}
      filter={(text, input) =>
        input
          .trim()
          .split(/\s+/)
          .every((token) => contains(text, token))
      }
    >
      <SearchField
        aria-label="Search"
        autoFocus={autoFocus}
        className="flex shrink-0 items-center gap-3 border-b border-border ps-4 pe-3"
      >
        {({ isEmpty }) => (
          <>
            <Search aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              className={cn(
                "h-13 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground",
                "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
              )}
            />
            {!isEmpty && (
              <CloseButton
                size="md"
                aria-label="Clear search"
                className="transition-[scale,opacity,background-color,color] duration-200 ease-settle starting:scale-50 starting:opacity-0"
              />
            )}
          </>
        )}
      </SearchField>
      <Menu
        aria-label={ariaLabel}
        onAction={onAction}
        onClose={onClose}
        autoFocus={onClose ? "first" : undefined}
        renderEmptyState={() => (
          <div className="flex flex-col items-center gap-1 px-6 pt-9 pb-10 text-center">
            {typeof emptyState === "function" ? emptyState(query) : (emptyState ?? <DefaultEmpty query={query} />)}
          </div>
        )}
        className="max-h-[min(376px,calc(100dvh-220px))] min-h-0 scroll-py-2 overflow-y-auto overscroll-contain p-2 outline-none"
      >
        {children}
      </Menu>
    </Autocomplete>
  );
}

function Footer({ closable }: { closable: boolean }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-4 border-t border-border px-4 text-xs text-muted-foreground">
      <Hint keys={["↑", "↓"]}>Navigate</Hint>
      <Hint keys={["↵"]}>Select</Hint>
      {closable && (
        <Hint keys={["esc"]} className="ms-auto">
          Close
        </Hint>
      )}
    </div>
  );
}

const surface =
  "flex w-full flex-col overflow-clip rounded-2xl border border-border bg-popover text-popover-foreground";

export function CommandPalettePanel({ className, ref, ...props }: CommandPalettePanelProps) {
  return (
    <div ref={ref} className={cn(surface, "max-w-[560px] shadow-lg", className)}>
      <PaletteBody {...props} />
      <Footer closable={false} />
    </div>
  );
}

export interface CommandPaletteProps extends Omit<CommandPalettePanelProps, "autoFocus"> {
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  shortcut?: string | null;
  isDismissable?: boolean;
  overlayClassName?: string;
  backdropBlur?: boolean;
}

export function CommandPalette({
  isOpen: isOpenProp,
  defaultOpen = false,
  onOpenChange,
  shortcut = "k",
  isDismissable = true,
  className,
  overlayClassName,
  backdropBlur = false,
  ref,
  "aria-label": ariaLabel,
  ...props
}: CommandPaletteProps) {
  const trigger = useContext(OverlayTriggerStateContext);
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = isOpenProp ?? trigger?.isOpen ?? own;

  const setOpen = (next: boolean) => {
    if (isOpenProp === undefined) {
      if (trigger) trigger.setOpen(next);
      else setOwn(next);
    }
    onOpenChange?.(next);
  };

  const latest = useRef({ isOpen, setOpen });
  useEffect(() => {
    latest.current = { isOpen, setOpen };
  });

  useEffect(() => {
    if (!shortcut) return;
    const key = shortcut.toLowerCase();
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.altKey || event.shiftKey) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== key) return;
      event.preventDefault();
      latest.current.setOpen(!latest.current.isOpen);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut]);

  return (
    <>
      <style href="miyuki-command-palette" precedence="miyuki">
        {keyframes}
      </style>
      <ModalOverlay
        isOpen={isOpen}
        onOpenChange={setOpen}
        isDismissable={isDismissable}
        className={cn(
          "fixed top-0 left-0 z-50 flex h-(--visual-viewport-height) w-full items-start justify-center px-4 pt-[max(16px,13vh)] pb-4",
          "bg-foreground/25 dark:bg-background/60",
          backdropBlur && "backdrop-blur-sm",
          "data-[entering]:animate-[miyuki-command-palette-fade-in_200ms_ease-out]",
          "data-[exiting]:animate-[miyuki-command-palette-fade-out_120ms_ease-in_forwards]",
          overlayClassName,
        )}
      >
        <Modal
          ref={ref}
          className={cn(
            surface,
            "max-h-full max-w-[560px] shadow-xl outline-none",
            "data-[entering]:animate-[miyuki-command-palette-rise_240ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-command-palette-sink_120ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-command-palette-fade-in_120ms_ease-out]",
            "motion-reduce:data-[exiting]:animate-[miyuki-command-palette-fade-out_100ms_ease-in_forwards]",
            className,
          )}
        >
          <Dialog
            aria-label={ariaLabel ?? "Command palette"}
            render={(domProps) => <section {...domProps} role={domProps.role ?? "dialog"} aria-modal="true" />}
            className="flex min-h-0 flex-col outline-none"
          >
            {({ close }) => (
              <>
                <PaletteBody {...props} autoFocus onClose={close} />
                <Footer closable />
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

export interface CommandGroupProps<T> extends Omit<MenuSectionProps<T>, "children"> {
  title?: ReactNode;
  children?: ReactNode;
}

export function CommandGroup<T extends object>({ title, children, className, ...props }: CommandGroupProps<T>) {
  return (
    <MenuSection {...props} className={cn("flex flex-col not-first:mt-1.5", className)}>
      {title != null && (
        <Header className="px-3 pt-2 pb-1.5 text-xs leading-4 font-medium text-muted-foreground">{title}</Header>
      )}
      {children}
    </MenuSection>
  );
}

export interface CommandItemProps<T = object> extends Omit<MenuItemProps<T>, "children"> {
  children?: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string[];
  ref?: Ref<HTMLDivElement>;
}

export function CommandItem<T extends object>({
  children,
  icon,
  shortcut,
  keywords,
  textValue,
  className,
  ...props
}: CommandItemProps<T>) {
  const label = textValue ?? (typeof children === "string" ? children : "");
  return (
    <MenuItem
      {...props}
      textValue={[label, ...(keywords ?? [])].join(" ").trim() || undefined}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/item relative flex min-h-10 cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm leading-5 text-foreground outline-none select-none",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          "data-[focused]:bg-accent data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      {icon != null && (
        <span
          aria-hidden="true"
          className="flex min-w-4 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-150 group-data-[focused]/item:text-foreground"
        >
          {icon}
        </span>
      )}
      <Text slot="label" className="min-w-0 flex-1 truncate">
        {children}
      </Text>
      {shortcut != null && (
        <Keyboard className="ms-3 flex shrink-0 gap-0.5 font-sans">
          {shortcut.split(" ").map((key, i) => (
            <span key={i} className={cn(kbd, "bg-card group-data-[focused]/item:bg-popover")}>
              {key}
            </span>
          ))}
        </Keyboard>
      )}
    </MenuItem>
  );
}

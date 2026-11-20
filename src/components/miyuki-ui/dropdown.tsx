"use client";

import { Check, ChevronRight } from "lucide-react";
import { createContext, type ReactElement, type ReactNode, type Ref, useContext } from "react";
import {
  Collection,
  composeRenderProps,
  Header,
  Keyboard,
  Menu,
  MenuItem,
  type MenuItemProps,
  type MenuProps,
  MenuSection,
  type MenuSectionProps,
  MenuTrigger,
  type MenuTriggerProps,
  Popover,
  type PopoverProps,
  Separator,
  type SeparatorProps,
  SubmenuTrigger,
  Text,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type DropdownItemTone = "default" | "destructive" | "warning";
export type DropdownIndicator = "check" | "dot";

const keyframes = `
@keyframes miyuki-dropdown-in {
  from { opacity: 0; transform: translate(var(--miyuki-dropdown-x, 0), var(--miyuki-dropdown-y, 0)) scale(0.96); }
}
@keyframes miyuki-dropdown-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes miyuki-dropdown-fade-in { from { opacity: 0; } }
@keyframes miyuki-dropdown-fade-out { to { opacity: 0; } }
`;

const alignedOrigin = {
  start:
    "[--miyuki-dropdown-ox:min(calc(var(--trigger-width)/2),100%)] [&[dir=rtl]]:[--miyuki-dropdown-ox:calc(100%_-_min(calc(var(--trigger-width)/2),100%))]",
  end: "[--miyuki-dropdown-ox:calc(100%_-_min(calc(var(--trigger-width)/2),100%))] [&[dir=rtl]]:[--miyuki-dropdown-ox:min(calc(var(--trigger-width)/2),100%)]",
  left: "[--miyuki-dropdown-ox:min(calc(var(--trigger-width)/2),100%)]",
  right: "[--miyuki-dropdown-ox:calc(100%_-_min(calc(var(--trigger-width)/2),100%))]",
};

function originStyles(placement: string) {
  const [side, align = ""] = placement.split(" ");
  if (
    (side === "top" || side === "bottom") &&
    (align === "start" || align === "end" || align === "left" || align === "right")
  )
    return cn(
      alignedOrigin[align],
      "origin-[var(--miyuki-dropdown-ox)_var(--miyuki-dropdown-oy,0px)] data-[placement=top]:[--miyuki-dropdown-oy:100%]",
    );
  return "origin-(--trigger-anchor-point)";
}

export const dropdownSurfaceStyles =
  "rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none";

export function dropdownItemStyles({ tone = "default" }: { tone?: DropdownItemTone } = {}) {
  return cn(
    "group/item relative flex min-h-8 cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm leading-5 outline-none select-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "[&_[data-slot=icon]]:flex [&_[data-slot=icon]]:min-w-5 [&_[data-slot=icon]]:shrink-0 [&_[data-slot=icon]]:items-center [&_[data-slot=icon]]:justify-center",
    "[&_[data-slot=description]]:text-[13px] [&_[data-slot=description]]:leading-[18px] [&_[data-slot=description]]:text-muted-foreground",
    "[&_[data-slot=shortcut]]:ms-3 [&_[data-slot=shortcut]]:font-mono [&_[data-slot=shortcut]]:text-xs [&_[data-slot=shortcut]]:tracking-wide [&_[data-slot=shortcut]]:text-muted-foreground",
    "[&_[data-slot=chevron]]:-me-1 [&_[data-slot=chevron]]:text-muted-foreground rtl:[&_[data-slot=chevron]]:rotate-180",
    "[&_[data-slot=indicator]]:flex [&_[data-slot=indicator]]:size-4 [&_[data-slot=indicator]]:shrink-0 [&_[data-slot=indicator]]:items-center [&_[data-slot=indicator]]:justify-center [&_[data-slot=indicator]]:text-brand",
    "data-[focused]:bg-accent data-[open]:bg-accent",
    "data-[focus-visible]:ring-1 data-[focus-visible]:ring-ring data-[focus-visible]:ring-inset",
    "data-[disabled]:opacity-50",
    tone === "destructive"
      ? [
          "text-destructive [&_[data-slot=icon]]:text-destructive",
          "data-[focused]:bg-destructive-soft data-[focused]:text-destructive-strong",
          "data-[focused]:[&_[data-slot=icon]]:text-destructive-strong",
          "data-[focus-visible]:ring-destructive/35",
        ]
      : tone === "warning"
        ? [
            "text-warning-strong [&_[data-slot=icon]]:text-warning-strong [&_[data-slot=indicator]]:text-warning-strong",
            "data-[focused]:bg-warning-soft data-[focused]:text-warning-strong",
            "data-[focused]:[&_[data-slot=icon]]:text-warning-strong data-[focused]:[&_[data-slot=description]]:text-warning-strong/80",
            "data-[focus-visible]:ring-warning/50",
          ]
        : [
            "text-foreground [&_[data-slot=icon]]:text-muted-foreground",
            "data-[focused]:[&_[data-slot=icon]]:text-foreground data-[open]:[&_[data-slot=icon]]:text-foreground",
            "data-[open]:[&_[data-slot=chevron]]:text-foreground",
          ],
  );
}

export const dropdownHeaderStyles = "px-2.5 pt-2 pb-1 text-xs leading-4 font-medium text-muted-foreground";

export const dropdownSeparatorStyles = "-mx-1 my-1 h-px border-0 bg-border";

export function Dropdown(props: MenuTriggerProps) {
  return <MenuTrigger {...props} />;
}

const SubmenuContext = createContext(false);
const IndicatorContext = createContext<DropdownIndicator | null>(null);

export interface DropdownMenuProps<T>
  extends MenuProps<T>,
    Pick<PopoverProps, "placement" | "offset" | "crossOffset" | "shouldFlip" | "isNonModal"> {
  indicator?: DropdownIndicator;
  popoverClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function DropdownMenu<T extends object>({
  placement,
  offset,
  crossOffset,
  shouldFlip,
  isNonModal,
  indicator,
  popoverClassName,
  className,
  ...props
}: DropdownMenuProps<T>) {
  const isSubmenu = useContext(SubmenuContext);
  return (
    <>
      <style href="miyuki-dropdown" precedence="miyuki">
        {keyframes}
      </style>
      <Popover
        placement={placement}
        offset={offset ?? (isSubmenu ? 8 : 6)}
        crossOffset={crossOffset ?? (isSubmenu ? -5 : undefined)}
        shouldFlip={shouldFlip}
        isNonModal={isNonModal}
        className={({ trigger }) =>
          cn(
            dropdownSurfaceStyles,
            "flex max-w-[min(320px,calc(100vw-24px))] flex-col overflow-hidden",
            isSubmenu ? "min-w-[200px]" : "min-w-[max(200px,var(--trigger-width))]",
            trigger === "ContextMenu"
              ? "origin-(--trigger-anchor-point)"
              : originStyles(placement ?? (isSubmenu ? "end top" : "bottom start")),
            "data-[placement=top]:[--miyuki-dropdown-y:4px] data-[placement=bottom]:[--miyuki-dropdown-y:-4px]",
            "data-[placement=left]:[--miyuki-dropdown-x:4px] data-[placement=right]:[--miyuki-dropdown-x:-4px]",
            "data-[entering]:animate-[miyuki-dropdown-in_180ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-dropdown-out_100ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-dropdown-fade-in_100ms_ease-out]",
            "motion-reduce:data-[exiting]:animate-[miyuki-dropdown-fade-out_100ms_ease-in_forwards]",
            popoverClassName,
          )
        }
      >
        <IndicatorContext value={indicator ?? null}>
          <Menu
            {...props}
            className={composeRenderProps(className, (cls) =>
              cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 outline-none", cls),
            )}
          />
        </IndicatorContext>
      </Popover>
    </>
  );
}

export interface DropdownItemProps<T = object> extends Omit<MenuItemProps<T>, "children"> {
  children?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  shortcut?: ReactNode;
  tone?: DropdownItemTone;
  ref?: Ref<HTMLDivElement>;
}

export function DropdownItem<T extends object>({
  children,
  icon,
  description,
  shortcut,
  tone = "default",
  textValue,
  className,
  ...props
}: DropdownItemProps<T>) {
  const indicatorOverride = useContext(IndicatorContext);
  return (
    <MenuItem
      {...props}
      textValue={textValue ?? (typeof children === "string" ? children : undefined)}
      className={composeRenderProps(className, (cls) => cn(dropdownItemStyles({ tone }), cls))}
    >
      {({ hasSubmenu, selectionMode, isSelected }) => {
        const indicator = indicatorOverride ?? (selectionMode === "multiple" ? "check" : "dot");
        return (
          <>
            {icon != null && (
              <span data-slot="icon" className={cn(description != null && "self-start pt-0.5")}>
                {icon}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <Text slot="label" className={cn("truncate", description != null && "font-medium")}>
                {children}
              </Text>
              {description != null && (
                <Text slot="description" data-slot="description">
                  {description}
                </Text>
              )}
            </span>
            {shortcut != null && <Keyboard data-slot="shortcut">{shortcut}</Keyboard>}
            {hasSubmenu && <ChevronRight data-slot="chevron" aria-hidden="true" />}
            {selectionMode !== "none" && (
              <span data-slot="indicator" aria-hidden="true" className={cn(description != null && "self-start pt-0.5")}>
                {isSelected &&
                  (indicator === "check" ? (
                    <Check strokeWidth={2.25} />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  ))}
              </span>
            )}
          </>
        );
      }}
    </MenuItem>
  );
}

export interface DropdownSectionProps<T> extends Omit<MenuSectionProps<T>, "children"> {
  title?: ReactNode;
  children?: ReactNode | ((item: T) => ReactElement);
}

export function DropdownSection<T extends object>({
  title,
  items,
  children,
  className,
  ...props
}: DropdownSectionProps<T>) {
  return (
    <MenuSection {...props} className={cn("flex flex-col", className)}>
      {title != null && <Header className={dropdownHeaderStyles}>{title}</Header>}
      {items != null && typeof children === "function" ? (
        <Collection items={items}>{children}</Collection>
      ) : (
        (children as ReactNode)
      )}
    </MenuSection>
  );
}

export type DropdownSeparatorProps = SeparatorProps;

export function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
  return <Separator {...props} className={cn(dropdownSeparatorStyles, className)} />;
}

export interface DropdownSubmenuProps {
  children: [ReactElement, ReactElement];
  delay?: number;
}

export function DropdownSubmenu({ children, delay }: DropdownSubmenuProps) {
  const [item, menu] = children;
  return (
    <SubmenuTrigger delay={delay}>
      {item}
      <SubmenuContext value={true}>{menu}</SubmenuContext>
    </SubmenuTrigger>
  );
}

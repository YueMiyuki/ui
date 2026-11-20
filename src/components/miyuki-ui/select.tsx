"use client";

import { Check, ChevronDown, CircleAlert, Search } from "lucide-react";
import { createContext, type ReactNode, type Ref, useContext } from "react";
import {
  Select as AriaSelect,
  type SelectProps as AriaSelectProps,
  Autocomplete,
  Button,
  Collection,
  composeRenderProps,
  FieldError,
  Header,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  type ListBoxItemProps,
  ListBoxSection,
  type ListBoxSectionProps,
  Popover,
  SearchField,
  SelectValue,
  Text,
  useFilter,
  type ValidationResult,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type SelectSize = "sm" | "md" | "lg";

const heights: Record<SelectSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padding: Record<SelectSize, string> = { sm: "ps-2.5 pe-2", md: "ps-3 pe-2.5", lg: "ps-3.5 pe-3" };

function triggerBox({ hovered, active, invalid }: { hovered: boolean; active: boolean; invalid: boolean }) {
  return cn(
    "rounded-lg border bg-card text-sm text-foreground shadow-xs outline-none",
    "transition-[border-color,box-shadow] duration-150 ease-settle",
    invalid ? "border-destructive" : active ? "border-brand" : hovered ? "border-border-strong" : "border-input",
    active && "ring-[3px]",
    active && (invalid ? "ring-destructive/25" : "ring-ring"),
  );
}

const keyframes = `
@keyframes miyuki-select-in {
  from { opacity: 0; transform: translateY(calc(var(--miyuki-select-dir, -1) * 4px)) scale(0.96); }
}
@keyframes miyuki-select-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes miyuki-select-fade-in { from { opacity: 0; } }
@keyframes miyuki-select-fade-out { to { opacity: 0; } }
`;

const popoverStyles = cn(
  "flex min-w-(--trigger-width) flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
  "[--miyuki-select-ox:min(calc(var(--trigger-width)/2),100%)] [&[dir=rtl]]:[--miyuki-select-ox:calc(100%_-_min(calc(var(--trigger-width)/2),100%))]",
  "origin-[var(--miyuki-select-ox)_var(--miyuki-select-oy,0px)] data-[placement=top]:[--miyuki-select-oy:100%]",
  "data-[placement=top]:[--miyuki-select-dir:1]",
  "data-[entering]:animate-[miyuki-select-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
  "data-[exiting]:animate-[miyuki-select-out_120ms_ease-in_forwards]",
  "motion-reduce:data-[entering]:animate-[miyuki-select-fade-in_120ms_ease-out]",
  "motion-reduce:data-[exiting]:animate-[miyuki-select-fade-out_100ms_ease-in_forwards]",
);

const TriggerContext = createContext(false);

interface ItemContentProps {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  avatar?: string;
  isSelected: boolean;
}

function ItemContent({ label, description, icon, avatar, isSelected }: ItemContentProps) {
  const inTrigger = useContext(TriggerContext);

  if (inTrigger) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        {avatar != null && (
          <img src={avatar} alt="" draggable={false} className="size-5 shrink-0 rounded-full object-cover" />
        )}
        {icon != null && (
          <span aria-hidden="true" className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <>
      {avatar != null && (
        <img
          src={avatar}
          alt=""
          draggable={false}
          className={cn("shrink-0 rounded-full object-cover", description != null ? "size-8" : "size-6")}
        />
      )}
      {icon != null && (
        <span
          aria-hidden="true"
          className="flex shrink-0 text-muted-foreground transition-colors duration-150 group-data-[focused]/item:text-foreground [&_svg]:size-4"
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <Text slot="label" className="truncate leading-5">
          {label}
        </Text>
        {description != null && (
          <Text slot="description" className="truncate text-xs leading-4 text-muted-foreground">
            {description}
          </Text>
        )}
      </span>
      <Check
        aria-hidden="true"
        strokeWidth={2.25}
        className={cn("size-4 shrink-0 text-brand-strong", !isSelected && "invisible")}
      />
    </>
  );
}

export interface SelectItemProps<T extends object = object> extends Omit<ListBoxItemProps<T>, "children"> {
  children: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  avatar?: string;
}

export function SelectItem<T extends object = object>({
  children,
  description,
  icon,
  avatar,
  textValue,
  className,
  ...props
}: SelectItemProps<T>) {
  return (
    <ListBoxItem
      {...props}
      textValue={textValue ?? (typeof children === "string" ? children : undefined)}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/item relative flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none",
          "transition-colors duration-100 data-[focused]:bg-accent",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      {({ isSelected }) => (
        <ItemContent label={children} description={description} icon={icon} avatar={avatar} isSelected={isSelected} />
      )}
    </ListBoxItem>
  );
}

export interface SelectSectionProps<T extends object = object>
  extends Omit<ListBoxSectionProps<T>, "children" | "items"> {
  title?: ReactNode;
  items?: Iterable<T>;
  children: ReactNode | ((item: T) => ReactNode);
}

export function SelectSection<T extends object = object>({
  title,
  items,
  children,
  className,
  ...props
}: SelectSectionProps<T>) {
  return (
    <ListBoxSection
      {...props}
      className={cn("not-first:mt-1 not-first:border-t not-first:border-border not-first:pt-1", className)}
    >
      {title != null && <Header className="px-2.5 py-1 text-xs leading-4 text-muted-foreground">{title}</Header>}
      {items != null ? (
        <Collection items={items}>{children as (item: T) => ReactNode}</Collection>
      ) : (
        (children as ReactNode)
      )}
    </ListBoxSection>
  );
}

function NoMatches() {
  return <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</p>;
}

export interface SelectProps<T extends object = object> extends Omit<AriaSelectProps<T>, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  size?: SelectSize;
  searchable?: boolean;
  searchPlaceholder?: string;
  items?: Iterable<T>;
  children: ReactNode | ((item: T) => ReactNode);
  triggerClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function Select<T extends object = object>({
  label,
  description,
  errorMessage,
  size = "md",
  searchable = false,
  searchPlaceholder = "Search",
  items,
  children,
  className,
  triggerClassName,
  ...props
}: SelectProps<T>) {
  const { contains } = useFilter({ sensitivity: "base" });

  const list = (
    <ListBox
      items={items}
      renderEmptyState={() => <NoMatches />}
      className="max-h-72 min-h-0 flex-1 scroll-py-1 overflow-y-auto p-1 outline-none"
    >
      {children}
    </ListBox>
  );

  return (
    <AriaSelect
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn("group/select flex flex-col gap-1.5 data-[disabled]:opacity-50", cls),
      )}
    >
      {({ isOpen, isInvalid }) => (
        <>
          <style href="miyuki-select" precedence="miyuki">
            {keyframes}
          </style>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <Button
            className={({ isHovered, isFocusVisible }) =>
              cn(
                triggerBox({ hovered: isHovered, active: isOpen || isFocusVisible, invalid: isInvalid }),
                "flex w-full min-w-0 cursor-default items-center gap-2 text-start select-none",
                "data-[disabled]:cursor-not-allowed",
                heights[size],
                padding[size],
                triggerClassName,
              )
            }
          >
            <SelectValue className="flex min-w-0 flex-1 items-center truncate data-[placeholder]:text-muted-foreground">
              {({ defaultChildren, isPlaceholder }) =>
                isPlaceholder ? defaultChildren : <TriggerContext value>{defaultChildren}</TriggerContext>
              }
            </SelectValue>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-settle motion-reduce:transition-none",
                isOpen && "rotate-180",
              )}
            />
          </Button>
          {description != null && !isInvalid && (
            <Text slot="description" className="text-[13px] leading-5 text-muted-foreground">
              {description}
            </Text>
          )}
          <FieldError className="flex items-start gap-1.5 text-[13px] leading-5 text-destructive empty:hidden">
            {(validation) => {
              const message =
                typeof errorMessage === "function"
                  ? errorMessage(validation)
                  : (errorMessage ?? validation.validationErrors.join(" "));
              if (message == null || message === "") return null;
              return (
                <>
                  <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
                  <span>{message}</span>
                </>
              );
            }}
          </FieldError>
          <Popover offset={6} className={popoverStyles}>
            {searchable ? (
              <Autocomplete filter={contains}>
                <SearchField
                  aria-label={searchPlaceholder}
                  autoFocus
                  className="flex shrink-0 items-center gap-2 border-b border-border ps-3 pe-2"
                >
                  <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    className="h-9 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                  />
                </SearchField>
                {list}
              </Autocomplete>
            ) : (
              list
            )}
          </Popover>
        </>
      )}
    </AriaSelect>
  );
}

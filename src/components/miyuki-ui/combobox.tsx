"use client";

import { ChevronDown, CircleAlert } from "lucide-react";
import type { ReactNode, Ref } from "react";
import {
  ComboBox as AriaComboBox,
  type ComboBoxProps as AriaComboBoxProps,
  Button,
  composeRenderProps,
  FieldError,
  Input,
  Label,
  ListBox,
  Popover,
  Text,
  type ValidationResult,
} from "react-aria-components";
import {
  SelectItem,
  type SelectItemProps,
  SelectSection,
  type SelectSectionProps,
} from "@/components/miyuki-ui/select";
import { cn } from "@/lib/utils";

export type ComboBoxSize = "sm" | "md" | "lg";

const heights: Record<ComboBoxSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<ComboBoxSize, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const button: Record<ComboBoxSize, string> = { sm: "w-8", md: "w-9", lg: "w-11" };
const padEnd: Record<ComboBoxSize, string> = { sm: "pe-8", md: "pe-9", lg: "pe-11" };

const keyframes = `
@keyframes miyuki-combobox-in {
  from { opacity: 0; transform: translateY(calc(var(--miyuki-combobox-dir, -1) * var(--miyuki-combobox-dist, 4px))); }
}
@keyframes miyuki-combobox-out { to { opacity: 0; } }
`;

export const ComboBoxItem = SelectItem;
export type ComboBoxItemProps<T extends object = object> = SelectItemProps<T>;

export const ComboBoxSection = SelectSection;
export type ComboBoxSectionProps<T extends object = object> = SelectSectionProps<T>;

export interface ComboBoxProps<T extends object = object> extends Omit<AriaComboBoxProps<T>, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  placeholder?: string;
  size?: ComboBoxSize;
  children: ReactNode | ((item: T) => ReactNode);
  emptyState?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function ComboBox<T extends object = object>({
  label,
  description,
  errorMessage,
  placeholder,
  size = "md",
  children,
  emptyState = "No matches",
  allowsEmptyCollection = true,
  className,
  ...props
}: ComboBoxProps<T>) {
  return (
    <AriaComboBox
      {...props}
      allowsEmptyCollection={allowsEmptyCollection}
      className={composeRenderProps(className, (cls) =>
        cn("group/combobox flex flex-col gap-1.5 data-[disabled]:opacity-50", cls),
      )}
    >
      {({ isOpen, isInvalid }) => (
        <>
          <style href="miyuki-combobox" precedence="miyuki">
            {keyframes}
          </style>
          {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
          <div className="relative">
            <Input
              placeholder={placeholder}
              className={({ isHovered, isFocused, isDisabled }) => {
                const active = isFocused || isOpen;
                return cn(
                  "w-full min-w-0 rounded-lg border bg-card text-sm text-foreground shadow-xs outline-none",
                  "transition-[border-color,box-shadow] duration-150 ease-settle placeholder:text-muted-foreground",
                  isInvalid
                    ? "border-destructive"
                    : active
                      ? "border-brand"
                      : isHovered
                        ? "border-border-strong"
                        : "border-input",
                  active && "ring-[3px]",
                  active && (isInvalid ? "ring-destructive/25" : "ring-ring"),
                  isDisabled && "cursor-not-allowed",
                  heights[size],
                  padStart[size],
                  padEnd[size],
                );
              }}
            />
            <Button
              className={cn(
                "absolute inset-y-0 end-0 flex cursor-default items-center justify-center rounded-e-lg text-muted-foreground outline-none",
                "transition-colors duration-150 data-[hovered]:text-foreground data-[disabled]:cursor-not-allowed",
                button[size],
              )}
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 transition-transform duration-200 ease-settle motion-reduce:transition-none",
                  isOpen && "rotate-180",
                )}
              />
            </Button>
          </div>
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
          <Popover
            offset={6}
            className={cn(
              "flex min-w-(--trigger-width) flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
              "data-[placement=top]:[--miyuki-combobox-dir:1] motion-reduce:[--miyuki-combobox-dist:0px]",
              "data-[entering]:animate-[miyuki-combobox-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
              "data-[exiting]:animate-[miyuki-combobox-out_120ms_ease-out_forwards]",
            )}
          >
            <ListBox
              renderEmptyState={() => (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyState}</p>
              )}
              className="max-h-72 min-h-0 flex-1 scroll-py-1 overflow-y-auto p-1 outline-none"
            >
              {children}
            </ListBox>
          </Popover>
        </>
      )}
    </AriaComboBox>
  );
}

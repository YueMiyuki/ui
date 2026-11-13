"use client";

import { CircleAlert } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import { createContext, type ReactNode, type Ref, useContext } from "react";
import {
  RadioGroup as AriaRadioGroup,
  type RadioGroupProps as AriaRadioGroupProps,
  composeRenderProps,
  FieldError,
  Label,
  RadioButton,
  RadioField,
  type RadioFieldProps,
  Text,
  type ValidationResult,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type RadioSize = "sm" | "md";

const GroupContext = createContext<{ size: RadioSize; orientation: "horizontal" | "vertical" } | null>(null);

const FLOOD: Transition = { type: "spring", stiffness: 500, damping: 30, mass: 0.6 };
const DROP: Transition = { type: "spring", stiffness: 500, damping: 20, mass: 0.6, delay: 0.05 };
const OFF: Transition = { duration: 0.1, ease: "easeOut" };
const FADE: Transition = { duration: 0.12, ease: "easeOut" };

interface IndicatorProps {
  size: RadioSize;
  isSelected: boolean;
  isHovered?: boolean;
  isFocusVisible?: boolean;
  isInvalid?: boolean;
  isPressed?: boolean;
  className?: string;
}

function RadioIndicator({
  size,
  isSelected,
  isHovered,
  isFocusVisible,
  isInvalid,
  isPressed,
  className,
}: IndicatorProps) {
  const reduce = useReducedMotion();

  const water = isSelected
    ? {
        scaleY: 1,
        opacity: 1,
        transition: reduce ? { scaleY: { duration: 0 }, opacity: FADE } : { scaleY: FLOOD, opacity: { duration: 0 } },
      }
    : {
        scaleY: reduce ? 1 : 0,
        opacity: 0,
        transition: { opacity: OFF, scaleY: { duration: 0, delay: OFF.duration } },
      };

  const dot = isSelected
    ? {
        y: "0%",
        scale: 1,
        opacity: 1,
        transition: reduce
          ? { y: { duration: 0 }, scale: { duration: 0 }, opacity: FADE }
          : { y: DROP, scale: DROP, opacity: { duration: 0.06, delay: DROP.delay } },
      }
    : {
        y: reduce ? "0%" : "-170%",
        scale: reduce ? 1 : 0.6,
        opacity: 0,
        transition: {
          opacity: OFF,
          y: { duration: 0, delay: OFF.duration },
          scale: { duration: 0, delay: OFF.duration },
        },
      };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block shrink-0 rounded-full border bg-card shadow-xs",
        "transition-[border-color,box-shadow,scale] duration-200 ease-settle",
        size === "md" ? "size-[18px]" : "size-4",
        isInvalid && !isSelected
          ? "border-destructive"
          : isHovered && !isSelected
            ? "border-border-strong"
            : "border-input",
        isFocusVisible && "ring-[3px] ring-ring",
        isPressed && "scale-[0.92]",
        className,
      )}
    >
      <span className="absolute -inset-px overflow-hidden rounded-full">
        <motion.span className="absolute inset-0 origin-bottom bg-brand" initial={false} animate={water} />
        <span className="absolute inset-[30%]">
          <motion.span className="block size-full rounded-full bg-brand-foreground" initial={false} animate={dot} />
        </span>
      </span>
    </span>
  );
}

export interface RadioGroupProps extends Omit<AriaRadioGroupProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  size?: RadioSize;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function RadioGroup({
  label,
  description,
  errorMessage,
  size = "md",
  orientation = "vertical",
  className,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <AriaRadioGroup
      {...props}
      orientation={orientation}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-1.5 data-[disabled]:opacity-50", cls))}
    >
      {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
      <div
        className={cn("flex", orientation === "vertical" ? "flex-col gap-3" : "flex-wrap items-start gap-x-6 gap-y-3")}
      >
        <GroupContext value={{ size, orientation }}>{children}</GroupContext>
      </div>
      {description != null && (
        <Text slot="description" className="mt-1 text-[13px] leading-5 text-muted-foreground">
          {description}
        </Text>
      )}
      <FieldError className="mt-1 flex items-start gap-1.5 text-[13px] leading-5 text-destructive empty:hidden">
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
    </AriaRadioGroup>
  );
}

export interface RadioProps extends Omit<RadioFieldProps, "children"> {
  children?: ReactNode;
  description?: ReactNode;
  size?: RadioSize;
  ref?: Ref<HTMLDivElement>;
}

export function Radio({ children, description, size, className, ...props }: RadioProps) {
  const group = useContext(GroupContext);
  const s = size ?? group?.size ?? "md";
  return (
    <RadioField
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-0.5 data-[disabled]:opacity-50", cls))}
    >
      <RadioButton
        className={cn(
          "flex w-fit items-start text-foreground outline-none select-none",
          "data-[disabled]:cursor-not-allowed",
          s === "md" ? "gap-2.5 text-sm leading-5" : "gap-2 text-[13px] leading-[18px]",
        )}
      >
        {(state) => (
          <>
            <RadioIndicator
              size={s}
              isSelected={state.isSelected}
              isHovered={state.isHovered}
              isFocusVisible={state.isFocusVisible}
              isInvalid={state.isInvalid}
              isPressed={state.isPressed}
              className="mt-px"
            />
            {children != null && <span>{children}</span>}
          </>
        )}
      </RadioButton>
      {description != null && (
        <Text
          slot="description"
          className={cn("text-[13px] leading-5 text-muted-foreground", s === "md" ? "ps-7" : "ps-6")}
        >
          {description}
        </Text>
      )}
    </RadioField>
  );
}

export interface RadioCardProps extends Omit<RadioFieldProps, "children"> {
  children?: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  size?: RadioSize;
  ref?: Ref<HTMLDivElement>;
}

export function RadioCard({ children, description, trailing, size, className, ...props }: RadioCardProps) {
  const group = useContext(GroupContext);
  const s = size ?? group?.size ?? "md";
  return (
    <RadioField
      {...props}
      className={composeRenderProps(className, (cls, { isSelected, isInvalid }) =>
        cn(
          "relative flex items-start gap-4 rounded-xl border bg-card p-4 shadow-xs",
          group?.orientation === "horizontal" && "min-w-48 flex-1",
          "transition-[border-color,background-color,box-shadow] duration-150 ease-settle",
          isSelected
            ? "border-brand bg-brand-soft/50"
            : isInvalid
              ? "border-destructive"
              : "border-border has-[[data-hovered]]:border-border-strong",
          "has-[[data-focus-visible]]:ring-[3px] has-[[data-focus-visible]]:ring-ring",
          "data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      {({ isSelected, isInvalid }) => (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <RadioButton
              className={cn(
                "w-fit text-sm leading-5 font-medium text-foreground outline-none select-none",
                "before:absolute before:inset-0 before:rounded-xl before:content-['']",
                "data-[disabled]:cursor-not-allowed",
              )}
            >
              {children}
            </RadioButton>
            {description != null && (
              <Text slot="description" className="text-[13px] leading-5 text-muted-foreground">
                {description}
              </Text>
            )}
          </div>
          {trailing != null && (
            <span className="text-sm leading-5 font-medium text-foreground tabular-nums">{trailing}</span>
          )}
          <RadioIndicator
            size={s}
            isSelected={isSelected}
            isInvalid={isInvalid}
            className={s === "md" ? "mt-px" : "mt-0.5"}
          />
        </>
      )}
    </RadioField>
  );
}

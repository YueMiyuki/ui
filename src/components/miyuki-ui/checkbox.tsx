"use client";

import { CircleAlert } from "lucide-react";
import { motion, type Transition, useReducedMotion } from "motion/react";
import { createContext, type ReactNode, type Ref, useContext } from "react";
import {
  CheckboxGroup as AriaCheckboxGroup,
  type CheckboxGroupProps as AriaCheckboxGroupProps,
  CheckboxButton,
  CheckboxField,
  type CheckboxFieldProps,
  composeRenderProps,
  FieldError,
  Label,
  Text,
  type ValidationResult,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type CheckboxSize = "sm" | "md";

const SizeContext = createContext<CheckboxSize | null>(null);

const geometry = {
  md: {
    box: "size-[18px]",
    view: 18,
    check: "M5 9.4 7.7 12 13 6.3",
    dash: "M5.5 9h7",
  },
  sm: {
    box: "size-4",
    view: 16,
    check: "M4.4 8.3 6.8 10.6 11.6 5.6",
    dash: "M4.75 8h6.5",
  },
} as const;

const FLOOD: Transition = { type: "spring", stiffness: 500, damping: 30, mass: 0.6 };
const DRAW_DELAY = 0.1;
const DRAW: Transition = { duration: 0.14, ease: [0.33, 0, 0.2, 1], delay: DRAW_DELAY };
const OFF: Transition = { duration: 0.1, ease: "easeOut" };
const FADE: Transition = { duration: 0.12, ease: "easeOut" };

interface IndicatorProps {
  size: CheckboxSize;
  isSelected: boolean;
  isIndeterminate: boolean;
  isHovered?: boolean;
  isFocusVisible?: boolean;
  isInvalid?: boolean;
  isPressed?: boolean;
  className?: string;
}

function CheckboxIndicator({
  size,
  isSelected,
  isIndeterminate,
  isHovered,
  isFocusVisible,
  isInvalid,
  isPressed,
  className,
}: IndicatorProps) {
  const reduce = useReducedMotion();
  const g = geometry[size];
  const on = isSelected || isIndeterminate;
  const showCheck = isSelected && !isIndeterminate;

  const water = on
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

  const mark = (visible: boolean) =>
    visible
      ? {
          pathLength: 1,
          opacity: 1,
          transition: reduce
            ? { pathLength: { duration: 0 }, opacity: FADE }
            : { pathLength: DRAW, opacity: { duration: 0.01, delay: DRAW_DELAY } },
        }
      : {
          pathLength: reduce ? 1 : 0,
          opacity: 0,
          transition: { opacity: OFF, pathLength: { duration: 0, delay: OFF.duration } },
        };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block shrink-0 rounded-sm border bg-card shadow-xs",
        "transition-[border-color,box-shadow,scale] duration-200 ease-settle",
        g.box,
        isInvalid && !on ? "border-destructive" : isHovered && !on ? "border-border-strong" : "border-input",
        isFocusVisible && "ring-[3px] ring-ring",
        isPressed && "scale-[0.92]",
        className,
      )}
    >
      <span className="absolute -inset-px overflow-hidden rounded-sm">
        <motion.span className="absolute inset-0 origin-bottom bg-brand" initial={false} animate={water} />
      </span>
      <svg
        viewBox={`0 0 ${g.view} ${g.view}`}
        fill="none"
        className="absolute -inset-px size-[calc(100%+2px)] text-brand-foreground"
      >
        <motion.path
          d={g.check}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={mark(showCheck)}
        />
        <motion.path
          d={g.dash}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          initial={false}
          animate={mark(isIndeterminate)}
        />
      </svg>
    </span>
  );
}

export interface CheckboxProps extends Omit<CheckboxFieldProps, "children"> {
  children?: ReactNode;
  description?: ReactNode;
  size?: CheckboxSize;
  ref?: Ref<HTMLDivElement>;
}

export function Checkbox({ children, description, size, className, ...props }: CheckboxProps) {
  const groupSize = useContext(SizeContext);
  const s = size ?? groupSize ?? "md";
  return (
    <CheckboxField
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-0.5 data-[disabled]:opacity-50", cls))}
    >
      <CheckboxButton
        className={cn(
          "group/checkbox flex w-fit items-start text-foreground outline-none select-none",
          "data-[disabled]:cursor-not-allowed",
          s === "md" ? "gap-2.5 text-sm leading-5" : "gap-2 text-[13px] leading-[18px]",
        )}
      >
        {(state) => (
          <>
            <CheckboxIndicator
              size={s}
              isSelected={state.isSelected}
              isIndeterminate={state.isIndeterminate}
              isHovered={state.isHovered}
              isFocusVisible={state.isFocusVisible}
              isInvalid={state.isInvalid}
              isPressed={state.isPressed}
              className="mt-px"
            />
            {children != null && <span>{children}</span>}
          </>
        )}
      </CheckboxButton>
      {description != null && (
        <Text
          slot="description"
          className={cn("text-[13px] leading-5 text-muted-foreground", s === "md" ? "ps-7" : "ps-6")}
        >
          {description}
        </Text>
      )}
    </CheckboxField>
  );
}

export interface CheckboxGroupProps extends Omit<AriaCheckboxGroupProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode | ((validation: ValidationResult) => ReactNode);
  size?: CheckboxSize;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function CheckboxGroup({
  label,
  description,
  errorMessage,
  size = "md",
  className,
  children,
  ...props
}: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex flex-col gap-1.5 data-[disabled]:opacity-50", cls))}
    >
      {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
      <div className="flex flex-col gap-3">
        <SizeContext value={size}>{children}</SizeContext>
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
    </AriaCheckboxGroup>
  );
}

export interface CheckboxCardProps extends Omit<CheckboxFieldProps, "children"> {
  children?: ReactNode;
  description?: ReactNode;
  size?: CheckboxSize;
  ref?: Ref<HTMLDivElement>;
}

export function CheckboxCard({ children, description, size, className, ...props }: CheckboxCardProps) {
  const groupSize = useContext(SizeContext);
  const s = size ?? groupSize ?? "md";
  return (
    <CheckboxField
      {...props}
      className={composeRenderProps(className, (cls, { isSelected, isIndeterminate, isInvalid }) =>
        cn(
          "relative flex items-start gap-4 rounded-xl border bg-card p-4 shadow-xs",
          "transition-[border-color,background-color,box-shadow] duration-150 ease-settle",
          isSelected || isIndeterminate
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
      {({ isSelected, isIndeterminate, isInvalid }) => (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <CheckboxButton
              className={cn(
                "w-fit text-sm leading-5 font-medium text-foreground outline-none select-none",
                "before:absolute before:inset-0 before:rounded-xl before:content-['']",
                "data-[disabled]:cursor-not-allowed",
              )}
            >
              {children}
            </CheckboxButton>
            {description != null && (
              <Text slot="description" className="text-[13px] leading-5 text-muted-foreground">
                {description}
              </Text>
            )}
          </div>
          <CheckboxIndicator
            size={s}
            isSelected={isSelected}
            isIndeterminate={isIndeterminate}
            isInvalid={isInvalid}
            className={s === "md" ? "mt-px" : "mt-0.5"}
          />
        </>
      )}
    </CheckboxField>
  );
}

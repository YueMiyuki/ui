"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useRef, useState } from "react";
import { ToggleButton } from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type ChipTone = "neutral" | "brand" | "success" | "warning" | "destructive";

const tones: Record<ChipTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success-strong",
  warning: "bg-warning-soft text-warning-strong",
  destructive: "bg-destructive-soft text-destructive-strong",
};

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const EXIT: Transition = { duration: 0.14, ease: [0.4, 0, 1, 1] };
const DRAW: Transition = { duration: 0.14, ease: [0.33, 0, 0.2, 1], delay: 0.06 };
const FADE: Transition = { duration: 0.1, ease: "easeOut" };

function ChipCheck({ on }: { on: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className="-me-1.5 flex shrink-0 justify-start overflow-hidden"
      initial={false}
      animate={{ width: on ? 20 : 0 }}
      transition={reduce ? { duration: 0 } : SETTLE}
    >
      <svg viewBox="0 0 14 14" fill="none" className="size-3.5 shrink-0">
        <motion.path
          d="M3 7.4 5.8 10.1 11 4.3"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={
            on
              ? {
                  pathLength: 1,
                  opacity: 1,
                  transition: reduce
                    ? { pathLength: { duration: 0 }, opacity: FADE }
                    : { pathLength: DRAW, opacity: { duration: 0.01, delay: DRAW.delay } },
                }
              : {
                  pathLength: reduce ? 1 : 0,
                  opacity: 0,
                  transition: { opacity: FADE, pathLength: { duration: 0, delay: FADE.duration } },
                }
          }
        />
      </svg>
    </motion.span>
  );
}

export interface ChipProps {
  children?: ReactNode;
  icon?: ReactNode;
  avatar?: string | ReactNode;
  tone?: ChipTone;
  onRemove?: () => void;
  removeLabel?: string;
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

export function Chip({
  children,
  icon,
  avatar,
  tone = "neutral",
  onRemove,
  removeLabel,
  selected,
  defaultSelected,
  onSelectedChange,
  isDisabled = false,
  className,
  ref,
}: ChipProps) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [removing, setRemoving] = useState(false);
  const toggle = selected !== undefined || defaultSelected !== undefined || onSelectedChange !== undefined;
  const [innerSelected, setInnerSelected] = useState(defaultSelected ?? false);
  const isOn = toggle && (selected ?? innerSelected);
  const text = typeof children === "string" || typeof children === "number" ? String(children) : undefined;
  const hasIcon = icon != null;
  const hasAvatar = avatar != null;

  function finishRemoving() {
    const root = rootRef.current;
    let next: HTMLElement | null = null;
    if (root?.contains(document.activeElement)) {
      const find = (el: Element | null) => el?.querySelector<HTMLElement>("[data-chip-remove], [data-chip-toggle]");
      next = find(root.nextElementSibling) ?? find(root.previousElementSibling) ?? null;
    }
    onRemove?.();
    setRemoving(false);
    if (next) requestAnimationFrame(() => next.focus({ preventScroll: true }));
  }

  const lead = (
    <>
      {toggle && <ChipCheck on={isOn} />}
      {hasAvatar ? (
        typeof avatar === "string" ? (
          <Avatar src={avatar} name={text} size="xs" aria-hidden="true" />
        ) : (
          <span className="flex shrink-0">{avatar}</span>
        )
      ) : hasIcon ? (
        <span aria-hidden="true" className="flex shrink-0 [&_svg]:size-3.5">
          {icon}
        </span>
      ) : null}
    </>
  );

  const body = (
    <>
      {lead}
      <span className="min-w-0 truncate leading-5">{children}</span>
    </>
  );

  const bodyPadding = cn(
    "relative inline-flex h-full min-w-0 items-center gap-1.5",
    hasAvatar ? "ps-1" : hasIcon ? "ps-2.5" : "ps-3",
    onRemove ? "pe-1" : "pe-3",
  );

  return (
    <motion.span
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-chip=""
      layout={reduce ? false : "position"}
      initial={false}
      animate={removing ? { opacity: 0, scale: reduce ? 1 : 0.8 } : { opacity: 1, scale: 1 }}
      transition={removing ? (reduce ? { duration: 0.1 } : EXIT) : { ...SETTLE, layout: SETTLE }}
      onAnimationComplete={() => {
        if (removing) finishRemoving();
      }}
      className={cn(
        "relative inline-flex h-7 max-w-full shrink-0 items-center rounded-full text-[13px] font-medium whitespace-nowrap select-none",
        "transition-[background-color,color,box-shadow,scale] duration-150 ease-settle",
        isOn ? "bg-brand-soft text-brand-strong" : tones[tone],
        onRemove && "pe-1",
        toggle && "has-[[data-chip-toggle][data-pressed]]:scale-[0.97]",
        toggle &&
          "has-[[data-chip-toggle][data-focus-visible]]:ring-[3px] has-[[data-chip-toggle][data-focus-visible]]:ring-ring",
        isDisabled && "opacity-50",
        removing && "pointer-events-none",
        className,
      )}
    >
      {toggle ? (
        <ToggleButton
          data-chip-toggle=""
          isSelected={isOn}
          onChange={(next) => {
            if (selected === undefined) setInnerSelected(next);
            onSelectedChange?.(next);
          }}
          isDisabled={isDisabled}
          className={cn(
            bodyPadding,
            "cursor-default rounded-full outline-none data-[disabled]:cursor-not-allowed",
            "before:absolute before:inset-0 before:rounded-full before:bg-current before:opacity-0 before:transition-opacity before:duration-150",
            "data-[hovered]:before:opacity-[0.06] data-[pressed]:before:opacity-[0.1]",
            onRemove && "before:-end-7",
          )}
        >
          {body}
        </ToggleButton>
      ) : (
        <span className={bodyPadding}>{body}</span>
      )}
      {onRemove && (
        <CloseButton
          data-chip-remove=""
          size="sm"
          aria-label={removeLabel ?? (text ? `Remove ${text}` : "Remove")}
          isDisabled={isDisabled}
          onPress={() => setRemoving(true)}
          className="relative z-10 text-current/70 data-[hovered]:bg-current/10 data-[hovered]:text-current"
        />
      )}
    </motion.span>
  );
}

"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { type ReactNode, type Ref, useRef } from "react";
import {
  Tag as AriaTag,
  TagGroup as AriaTagGroup,
  type TagGroupProps as AriaTagGroupProps,
  type TagProps as AriaTagProps,
  composeRenderProps,
  type Key,
  Label,
  TagList,
  Text,
} from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type TagTone = "neutral" | "brand" | "success" | "warning" | "destructive";

const tones: Record<TagTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success-strong",
  warning: "bg-warning-soft text-warning-strong",
  destructive: "bg-destructive-soft text-destructive-strong",
};

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const DRAW: Transition = { duration: 0.14, ease: [0.33, 0, 0.2, 1], delay: 0.06 };
const FADE: Transition = { duration: 0.1, ease: "easeOut" };
const EXIT_MS = 140;

function TagCheck({ on }: { on: boolean }) {
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

export interface TagGroupProps<T extends object> extends Omit<AriaTagGroupProps, "children" | "className"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  items?: Iterable<T>;
  children?: ReactNode | ((item: T) => ReactNode);
  renderEmptyState?: () => ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function TagGroup<T extends object>({
  label,
  description,
  errorMessage,
  items,
  children,
  renderEmptyState,
  onRemove,
  className,
  ...props
}: TagGroupProps<T>) {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);

  function handleRemove(keys: Set<Key>) {
    const list = listRef.current;
    if (!onRemove) return;
    if (!list || reduce) {
      onRemove(keys);
      return;
    }
    const rows = [...list.querySelectorAll<HTMLElement>("[data-key]")];
    const wanted = new Set([...keys].map(String));
    for (const el of rows) if (wanted.has(el.dataset.key ?? "")) el.setAttribute("data-removing", "");
    setTimeout(() => {
      const before = new Map(rows.map((el) => [el.dataset.key, el.getBoundingClientRect()]));
      onRemove(keys);
      requestAnimationFrame(() => {
        for (const el of list.querySelectorAll<HTMLElement>("[data-key]")) {
          el.removeAttribute("data-removing");
          const was = before.get(el.dataset.key);
          if (!was) continue;
          const now = el.getBoundingClientRect();
          const dx = was.left - now.left;
          const dy = was.top - now.top;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
          el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
            duration: 280,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          });
        }
      });
    }, EXIT_MS);
  }

  return (
    <AriaTagGroup
      {...props}
      onRemove={onRemove ? handleRemove : undefined}
      className={cn("flex flex-col gap-1.5", className)}
    >
      {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
      <TagList
        ref={listRef}
        items={items}
        renderEmptyState={renderEmptyState}
        className="flex min-h-7 flex-wrap gap-2 outline-none data-[empty]:items-center data-[empty]:text-[13px] data-[empty]:text-muted-foreground"
      >
        {children}
      </TagList>
      {description != null && (
        <Text slot="description" className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
          {description}
        </Text>
      )}
      {errorMessage != null && (
        <Text slot="errorMessage" className="mt-0.5 text-[13px] leading-5 text-destructive">
          {errorMessage}
        </Text>
      )}
    </AriaTagGroup>
  );
}

export interface TagProps extends Omit<AriaTagProps, "children"> {
  children?: ReactNode;
  icon?: ReactNode;
  avatar?: string | ReactNode;
  tone?: TagTone;
  ref?: Ref<HTMLDivElement>;
}

export function Tag({ children, icon, avatar, tone = "neutral", textValue, className, ...props }: TagProps) {
  const text = textValue ?? (typeof children === "string" ? children : undefined);
  const hasAvatar = avatar != null;
  const hasIcon = icon != null;

  return (
    <AriaTag
      {...props}
      textValue={text}
      className={composeRenderProps(className, (cls, { selectionMode, allowsRemoving }) =>
        cn(
          "relative inline-flex h-7 max-w-full shrink-0 cursor-default items-center gap-1.5 rounded-full text-[13px] font-medium whitespace-nowrap outline-none select-none",
          "transition-[background-color,color,box-shadow,opacity,scale] duration-150 ease-settle",
          tones[tone],
          "data-[selected]:bg-brand-soft data-[selected]:text-brand-strong",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          selectionMode !== "none" && [
            "data-[pressed]:scale-[0.97]",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-current before:opacity-0 before:transition-opacity before:duration-150",
            "data-[hovered]:before:opacity-[0.06] data-[pressed]:before:opacity-[0.1]",
          ],
          hasAvatar ? "ps-1" : hasIcon ? "ps-2.5" : "ps-3",
          allowsRemoving ? "pe-1" : "pe-3",
          "data-[removing]:pointer-events-none data-[removing]:scale-[0.8] data-[removing]:opacity-0 data-[removing]:ease-in",
          cls,
        ),
      )}
    >
      {({ isSelected, selectionMode, allowsRemoving, isDisabled }) => (
        <>
          {selectionMode !== "none" && <TagCheck on={isSelected} />}
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
          <span className="min-w-0 truncate leading-5">{children}</span>
          {allowsRemoving && (
            <CloseButton
              slot="remove"
              size="sm"
              aria-label="Remove"
              isDisabled={isDisabled}
              className="-ms-0.5 text-current/70 data-[hovered]:bg-current/10 data-[hovered]:text-current"
            />
          )}
        </>
      )}
    </AriaTag>
  );
}

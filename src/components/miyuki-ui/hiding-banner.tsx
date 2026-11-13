"use client";

import { X } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import { cn } from "@/lib/utils";

export interface HidingBannerProps extends ComponentProps<"div"> {
  hideOnScroll?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export function HidingBanner({
  hideOnScroll = true,
  dismissible = false,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
  children,
  onFocus,
  ref: externalRef,
  ...props
}: HidingBannerProps) {
  const [hidden, setHidden] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hideOnScroll) return;
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - last;
      last = y;
      const height = ref.current?.offsetHeight ?? 48;
      if (y <= height) setHidden(false);
      else if (delta > 2) setHidden(true);
      else if (delta < -2) setHidden(false);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [hideOnScroll]);

  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node;
    if (typeof externalRef === "function") externalRef(node);
    else if (externalRef) externalRef.current = node;
  };

  if (dismissed) return null;

  const isHidden = hideOnScroll && hidden;

  return (
    <div
      ref={setRef}
      role="region"
      aria-label="Announcement"
      data-hidden={isHidden || undefined}
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-brand-soft text-foreground",
        "transition-transform duration-300 ease-settle motion-reduce:transition-none",
        "data-[hidden]:-translate-y-full",
        className,
      )}
      onFocus={(event) => {
        setHidden(false);
        onFocus?.(event);
      }}
      {...props}
    >
      <div className="mx-auto flex min-h-11 max-w-5xl items-center gap-3 px-4 py-2">
        <div className={cn("min-w-0 flex-1 text-center text-sm", dismissible && "pl-8")}>{children}</div>
        {dismissible ? (
          <Button
            aria-label={dismissLabel}
            onPress={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="grid size-7 shrink-0 cursor-default place-items-center rounded-md text-foreground/70 outline-none transition-colors duration-150 data-[hovered]:bg-foreground/[0.06] data-[hovered]:text-foreground data-[pressed]:scale-[0.96] data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

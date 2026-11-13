"use client";

import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { Button } from "react-aria-components";
import { cn } from "@/lib/utils";

export type PaginationVariant = "default" | "compact";

type Slot = number | "start-gap" | "end-gap";

function slots(page: number, total: number, siblings: number, boundaries: number): Slot[] {
  const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
  const width = boundaries * 2 + siblings * 2 + 3;
  if (total <= width) return range(1, total);

  const run = boundaries + siblings * 2 + 2;
  if (page <= boundaries + siblings + 2) {
    return [...range(1, run), "end-gap", ...range(total - boundaries + 1, total)];
  }
  if (page >= total - boundaries - siblings - 1) {
    return [...range(1, boundaries), "start-gap", ...range(total - run + 1, total)];
  }
  return [
    ...range(1, boundaries),
    "start-gap",
    ...range(page - siblings, page + siblings),
    "end-gap",
    ...range(total - boundaries + 1, total),
  ];
}

const square = cn(
  "inline-flex h-9 min-w-9 shrink-0 cursor-default items-center justify-center rounded-lg px-1.5 text-sm font-medium tabular-nums outline-none select-none",
  "transition-[transform,background-color,box-shadow,border-color,color] duration-150 ease-settle",
  "data-[pressed]:scale-[0.96] data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
);

export interface PaginationProps extends Omit<ComponentProps<"nav">, "onChange"> {
  page?: number;
  defaultPage?: number;
  onChange?: (page: number) => void;
  total: number;
  siblings?: number;
  boundaries?: number;
  variant?: PaginationVariant;
  labels?: { previous?: string; next?: string; page?: (page: number) => string };
}

export function Pagination({
  page: pageProp,
  defaultPage = 1,
  onChange,
  total,
  siblings = 1,
  boundaries = 1,
  variant = "default",
  labels,
  className,
  "aria-label": ariaLabel = "Pagination",
  ...props
}: PaginationProps) {
  const [inner, setInner] = useState(defaultPage);
  const count = Math.max(1, Math.floor(total));
  const page = Math.min(Math.max(1, pageProp ?? inner), count);

  const go = (next: number) => {
    const target = Math.min(Math.max(1, next), count);
    if (target === page) return;
    if (pageProp === undefined) setInner(target);
    onChange?.(target);
  };

  const pageLabel = labels?.page ?? ((n: number) => `Page ${n}`);
  const arrow = cn(square, "px-0 text-foreground data-[hovered]:bg-accent [&_svg]:size-4");

  return (
    <nav {...props} aria-label={ariaLabel} className={cn("flex items-center", className)}>
      <ul className="flex items-center gap-1">
        <li>
          <Button
            aria-label={labels?.previous ?? "Previous page"}
            isDisabled={page <= 1}
            onPress={() => go(page - 1)}
            className={arrow}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
        </li>
        {variant === "compact" ? (
          <li className="px-2 text-sm whitespace-nowrap text-muted-foreground tabular-nums" aria-live="polite">
            Page <span className="font-medium text-foreground">{page}</span> of{" "}
            <span className="font-medium text-foreground">{count}</span>
          </li>
        ) : (
          slots(page, count, Math.max(0, siblings), Math.max(0, boundaries)).map((slot) =>
            typeof slot === "number" ? (
              <li key={slot}>
                <Button
                  aria-label={pageLabel(slot)}
                  aria-current={slot === page ? "page" : undefined}
                  onPress={() => go(slot)}
                  className={cn(
                    square,
                    "border",
                    slot === page
                      ? "border-border-strong bg-card text-foreground shadow-xs"
                      : "border-transparent text-foreground data-[hovered]:bg-accent",
                  )}
                >
                  {slot}
                </Button>
              </li>
            ) : (
              <li
                key={slot}
                aria-hidden="true"
                className="flex size-9 items-center justify-center text-muted-foreground"
              >
                <Ellipsis className="size-4" />
              </li>
            ),
          )
        )}
        <li>
          <Button
            aria-label={labels?.next ?? "Next page"}
            isDisabled={page >= count}
            onPress={() => go(page + 1)}
            className={arrow}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </li>
      </ul>
    </nav>
  );
}

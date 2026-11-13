"use client";

import { createContext, type ReactNode, type Ref, useContext } from "react";
import {
  Button,
  composeRenderProps,
  Disclosure,
  DisclosureGroup,
  type DisclosureGroupProps,
  DisclosurePanel,
  type DisclosureProps,
  Heading,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type AccordionVariant = "flush" | "separated";

const VariantContext = createContext<AccordionVariant>("flush");

export interface AccordionProps extends DisclosureGroupProps {
  variant?: AccordionVariant;
  ref?: Ref<HTMLDivElement>;
}

export function Accordion({ variant = "flush", className, children, ...props }: AccordionProps) {
  return (
    <DisclosureGroup
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "flex w-full flex-col",
          variant === "flush" ? "border-b border-border" : "gap-2",
          "data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      {composeRenderProps(children, (content) => (
        <VariantContext value={variant}>{content}</VariantContext>
      ))}
    </DisclosureGroup>
  );
}

function PlusMinus() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 text-muted-foreground transition-colors duration-150",
        "group-data-[hovered]/trigger:text-foreground group-data-[expanded]/item:text-foreground",
      )}
    >
      <path d="M3 8h10" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path
        d="M8 3v10"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        className={cn(
          "origin-center [transform-box:fill-box] transition-transform duration-[180ms] ease-settle",
          "group-data-[expanded]/item:rotate-90 group-data-[expanded]/item:duration-[280ms]",
          "motion-reduce:transition-none",
        )}
      />
    </svg>
  );
}

export interface AccordionItemProps extends Omit<DisclosureProps, "children"> {
  title: ReactNode;
  children?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  ref?: Ref<HTMLDivElement>;
}

export function AccordionItem({ title, children, headingLevel = 3, className, ...props }: AccordionItemProps) {
  const variant = useContext(VariantContext);
  const separated = variant === "separated";
  const inset = separated ? "px-4" : "-mx-2 px-2";

  return (
    <Disclosure
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/item",
          separated
            ? "rounded-xl border border-border bg-card shadow-xs transition-[box-shadow,border-color] duration-200 ease-settle data-[expanded]:border-border-strong data-[expanded]:shadow-sm"
            : "border-t border-border",
          "data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      <Heading level={headingLevel} className="m-0 flex">
        <Button
          slot="trigger"
          className={cn(
            "group/trigger flex min-h-13 flex-1 cursor-default items-center justify-between gap-4 py-3.5 text-start",
            "text-sm leading-5 font-medium text-foreground outline-none select-none",
            "rounded-lg data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
            separated && "rounded-[13px]",
            "data-[disabled]:cursor-not-allowed",
            inset,
          )}
        >
          <span className="min-w-0">{title}</span>
          <PlusMinus />
        </Button>
      </Heading>
      <DisclosurePanel
        className={cn(
          "grid grid-rows-[0fr] transition-[grid-template-rows] duration-[180ms] ease-[cubic-bezier(0.4,0,1,1)]",
          "group-data-[expanded]/item:grid-rows-[1fr] group-data-[expanded]/item:duration-[300ms] group-data-[expanded]/item:ease-settle",
          "motion-reduce:transition-none",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "pb-4 text-sm leading-6 text-muted-foreground",
              "-translate-y-1 opacity-0 transition-[opacity,translate] duration-[120ms] ease-out",
              "group-data-[expanded]/item:translate-y-0 group-data-[expanded]/item:opacity-100",
              "group-data-[expanded]/item:delay-[60ms] group-data-[expanded]/item:duration-[240ms] group-data-[expanded]/item:ease-settle",
              "motion-reduce:translate-y-0",
              separated ? "px-4" : "pe-8",
            )}
          >
            {children}
          </div>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}

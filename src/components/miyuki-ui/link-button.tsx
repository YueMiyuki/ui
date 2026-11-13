"use client";

import type { ReactNode, Ref } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
  composeRenderProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export type LinkButtonTone = "brand" | "ink" | "muted";
export type LinkButtonSize = "sm" | "md";

interface LinkButtonOwnProps {
  tone?: LinkButtonTone;
  size?: LinkButtonSize;
  iconEnd?: ReactNode;
  children?: ReactNode;
}

export interface LinkButtonAsLinkProps
  extends LinkButtonOwnProps,
    Omit<AriaLinkProps, "children" | keyof LinkButtonOwnProps> {
  href: string;
  ref?: Ref<HTMLAnchorElement>;
}

export interface LinkButtonAsButtonProps
  extends LinkButtonOwnProps,
    Omit<AriaButtonProps, "children" | keyof LinkButtonOwnProps> {
  href?: undefined;
  ref?: Ref<HTMLButtonElement>;
}

export type LinkButtonProps = LinkButtonAsLinkProps | LinkButtonAsButtonProps;

const tones: Record<LinkButtonTone, string> = {
  brand: "text-brand-strong",
  ink: "text-foreground",
  muted: "text-muted-foreground data-[hovered]:text-foreground data-[focus-visible]:text-foreground",
};

const sizes: Record<LinkButtonSize, string> = {
  sm: "text-[13px] leading-[1.2] [&_svg]:size-3.5",
  md: "text-sm leading-[1.2] [&_svg]:size-4",
};

const base = cn(
  "group/link -mx-1 -my-0.5 box-decoration-clone cursor-pointer rounded-sm px-1 py-0.5 align-baseline font-medium wrap-break-word outline-none",
  "bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-origin-content bg-[length:0%_1px] bg-[position:100%_calc(100%+2px)]",
  "transition-[color,background-size] duration-200 ease-settle motion-reduce:transition-colors",
  "data-[hovered]:bg-[length:100%_1px] data-[hovered]:bg-[position:0_calc(100%+2px)] data-[focus-visible]:bg-[length:100%_1px] data-[focus-visible]:bg-[position:0_calc(100%+2px)]",
  "focus-visible:ring-[3px] focus-visible:ring-ring data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
);

function Content({ iconEnd, children }: Pick<LinkButtonOwnProps, "iconEnd" | "children">) {
  return (
    <>
      {children}
      {iconEnd != null ? (
        <span className="ms-1 inline-flex align-[-0.2em] transition-transform duration-200 ease-settle group-data-[hovered]/link:translate-x-0.5 motion-reduce:transition-none">
          {iconEnd}
        </span>
      ) : null}
    </>
  );
}

function AsLink({ tone = "brand", size = "md", iconEnd, children, className, ...props }: LinkButtonAsLinkProps) {
  return (
    <AriaLink {...props} className={composeRenderProps(className, (cls) => cn(base, tones[tone], sizes[size], cls))}>
      <Content iconEnd={iconEnd}>{children}</Content>
    </AriaLink>
  );
}

function AsButton({ tone = "brand", size = "md", iconEnd, children, className, ...props }: LinkButtonAsButtonProps) {
  return (
    <AriaButton {...props} className={composeRenderProps(className, (cls) => cn(base, tones[tone], sizes[size], cls))}>
      <Content iconEnd={iconEnd}>{children}</Content>
    </AriaButton>
  );
}

export function LinkButton(props: LinkButtonProps) {
  return props.href != null ? <AsLink {...props} /> : <AsButton {...props} />;
}

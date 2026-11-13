"use client";

import { ChevronRight, Ellipsis } from "lucide-react";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import {
  Breadcrumb as AriaBreadcrumb,
  type BreadcrumbProps as AriaBreadcrumbProps,
  Breadcrumbs as AriaBreadcrumbs,
  type BreadcrumbsProps as AriaBreadcrumbsProps,
  Button,
  composeRenderProps,
  Link,
  type LinkProps,
} from "react-aria-components";
import { Dropdown, DropdownItem, DropdownMenu } from "@/components/miyuki-ui/dropdown";
import { cn } from "@/lib/utils";

function Separator() {
  return <ChevronRight aria-hidden="true" strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground/70" />;
}

export interface BreadcrumbProps extends Omit<AriaBreadcrumbProps, "children"> {
  href?: string;
  children: ReactNode;
  linkProps?: Omit<LinkProps, "href" | "children" | "className">;
  ref?: Ref<HTMLLIElement>;
}

export function Breadcrumb({ href, children, linkProps, className, ...props }: BreadcrumbProps) {
  return (
    <AriaBreadcrumb
      {...props}
      className={composeRenderProps(className, (cls) => cn("flex min-w-0 items-center gap-1.5", cls))}
    >
      {({ isCurrent }) => (
        <>
          <Link
            {...linkProps}
            href={isCurrent ? undefined : href}
            className={cn(
              "-mx-1 truncate rounded-md px-1 py-0.5 text-sm text-muted-foreground outline-none",
              "transition-[color,box-shadow] duration-150 ease-settle",
              "data-[hovered]:text-foreground data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
              "data-[current]:font-medium data-[current]:text-foreground",
              "data-[disabled]:cursor-default",
            )}
          >
            {children}
          </Link>
          {!isCurrent && <Separator />}
        </>
      )}
    </AriaBreadcrumb>
  );
}

function CollapsedCrumbs({ crumbs }: { crumbs: ReactElement<BreadcrumbProps>[] }) {
  return (
    <AriaBreadcrumb className="flex items-center gap-1.5">
      <Dropdown>
        <Button
          aria-label={`Show ${crumbs.length} more ${crumbs.length === 1 ? "page" : "pages"}`}
          className={cn(
            "-mx-0.5 grid h-6 w-7 cursor-default place-items-center rounded-md text-muted-foreground outline-none",
            "transition-[color,background-color,box-shadow,scale] duration-150 ease-settle",
            "data-[hovered]:bg-accent data-[hovered]:text-foreground data-[pressed]:scale-[0.96]",
            "data-[pressed]:bg-accent data-[pressed]:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
            "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          )}
        >
          <Ellipsis aria-hidden="true" className="size-4" />
        </Button>
        <DropdownMenu aria-label="Hidden pages" placement="bottom start" popoverClassName="min-w-44">
          {crumbs.map((crumb, i) => {
            const { href, children, id } = crumb.props;
            return (
              <DropdownItem
                key={id ?? i}
                id={id ?? `miyuki-crumb-${i}`}
                href={href}
                textValue={typeof children === "string" ? children : undefined}
              >
                {children}
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
      <Separator />
    </AriaBreadcrumb>
  );
}

export interface BreadcrumbsProps extends Omit<AriaBreadcrumbsProps<object>, "children" | "items"> {
  children: ReactNode;
  maxItems?: number;
  "aria-label"?: string;
  ref?: Ref<HTMLOListElement>;
}

export function Breadcrumbs({
  children,
  maxItems = 4,
  className,
  "aria-label": ariaLabel = "Breadcrumbs",
  ref,
  ...props
}: BreadcrumbsProps) {
  const listRef = useRef<HTMLOListElement>(null);
  useImperativeHandle(ref, () => listRef.current as HTMLOListElement, []);
  // React Aria always names the list too; the nav landmark keeps the only name.
  useLayoutEffect(() => {
    listRef.current?.removeAttribute("aria-label");
  });
  const crumbs = Children.toArray(children).filter(isValidElement) as ReactElement<BreadcrumbProps>[];
  const tail = Math.max(1, maxItems - 2);
  const collapse = crumbs.length > Math.max(maxItems, 3);
  const shown = collapse
    ? [
        crumbs[0],
        <CollapsedCrumbs key="miyuki-breadcrumb-collapsed" crumbs={crumbs.slice(1, crumbs.length - tail)} />,
        ...crumbs.slice(crumbs.length - tail),
      ]
    : crumbs;

  return (
    <nav aria-label={ariaLabel} className="min-w-0">
      <AriaBreadcrumbs
        {...props}
        ref={listRef}
        className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}
      >
        {shown}
      </AriaBreadcrumbs>
    </nav>
  );
}

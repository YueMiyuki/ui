import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BentoGridProps = ComponentProps<"div">;

export function BentoGrid({ className, children, ...props }: BentoGridProps) {
  return (
    <div {...props} className={cn("@container", className)}>
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @3xl:grid-cols-3">{children}</div>
    </div>
  );
}

export interface BentoGridItemProps extends Omit<ComponentProps<"div">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "water";
}

export function BentoGridItem({
  title,
  description,
  header,
  icon,
  tone = "default",
  className,
  children,
  ...props
}: BentoGridItemProps) {
  const water = tone === "water";
  return (
    <div
      {...props}
      data-tone={tone}
      className={cn(
        "group/bento flex flex-col rounded-2xl border p-4 transition-shadow duration-200 ease-settle hover:shadow-md focus-within:shadow-md",
        water
          ? "border-transparent bg-brand text-brand-foreground shadow-sm"
          : "border-border bg-card text-card-foreground shadow-xs",
        className,
      )}
    >
      {header ? (
        <div
          className={cn(
            "relative h-36 overflow-clip rounded-xl transition-transform duration-200 ease-settle",
            "group-hover/bento:translate-x-1 group-focus-within/bento:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/bento:translate-x-0 motion-reduce:group-focus-within/bento:translate-x-0",
            water ? "bg-brand-foreground/10" : "bg-muted",
          )}
        >
          {header}
        </div>
      ) : null}
      <div className={cn("flex flex-1 flex-col", header && "mt-4")}>
        {icon ? (
          <div className={cn("mb-2 [&_svg]:size-4", water ? "text-brand-foreground/80" : "text-muted-foreground")}>
            {icon}
          </div>
        ) : null}
        {title ? <h3 className="text-sm font-semibold tracking-[-0.005em]">{title}</h3> : null}
        {description ? (
          <p className={cn("mt-1 text-[13px]/5", water ? "text-brand-foreground/85" : "text-muted-foreground")}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

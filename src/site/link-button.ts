import { cn } from "@/lib/utils";

export function inkLinkClass(className?: string) {
  return cn(
    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium whitespace-nowrap text-primary-foreground shadow-xs outline-none",
    "transition-[transform,background-color,box-shadow] duration-150 ease-settle hover:bg-primary/90 active:scale-[0.98]",
    "focus-visible:ring-[3px] focus-visible:ring-ring",
    className,
  );
}

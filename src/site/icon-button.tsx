import { cn } from "@/lib/utils";

export function iconButtonClass(className?: string) {
  return cn(
    "inline-grid size-8 shrink-0 cursor-default place-items-center rounded-lg text-muted-foreground outline-none",
    "transition-[background-color,color,transform] duration-150 ease-settle",
    "hover:bg-accent hover:text-foreground data-[hovered]:bg-accent data-[hovered]:text-foreground",
    "data-[pressed]:scale-[0.96] active:scale-[0.96]",
    "focus-visible:ring-[3px] focus-visible:ring-ring data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
    "disabled:pointer-events-none disabled:opacity-40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
    "[&_svg]:size-4",
    className,
  );
}

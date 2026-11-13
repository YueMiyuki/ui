import { Tabs as BaseTabs } from "fumadocs-ui/components/tabs";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export { Tab } from "fumadocs-ui/components/tabs";

const plain = cn(
  "my-6 overflow-visible rounded-none border-0 bg-transparent",
  "[&>[role=tablist]]:gap-5 [&>[role=tablist]]:border-b [&>[role=tablist]]:border-border [&>[role=tablist]]:px-0",
  "[&>[role=tablist]>[role=tab]]:-mb-px [&>[role=tablist]>[role=tab]]:border-b-2 [&>[role=tablist]>[role=tab]]:pt-1 [&>[role=tablist]>[role=tab]]:pb-2.5",
  "[&>[role=tablist]>[role=tab]]:outline-none [&>[role=tablist]>[role=tab]:focus-visible]:rounded-sm [&>[role=tablist]>[role=tab]:focus-visible]:ring-[3px] [&>[role=tablist]>[role=tab]:focus-visible]:ring-ring",
  "[&>[role=tablist]>[role=tab][data-state=active]]:border-brand [&>[role=tablist]>[role=tab][data-state=active]]:text-foreground",
  "[&>[role=tabpanel]]:rounded-none [&>[role=tabpanel]]:bg-transparent [&>[role=tabpanel]]:p-0 [&>[role=tabpanel]]:pt-5",
  "[&>[role=tabpanel]>figure:only-child]:m-0 [&>[role=tabpanel]>figure:only-child]:border",
);

export function Tabs({ className, ...props }: ComponentProps<typeof BaseTabs>) {
  return <BaseTabs {...props} className={cn(plain, className)} />;
}

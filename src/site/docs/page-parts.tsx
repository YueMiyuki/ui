import { DocsDescription, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import type { ReactNode } from "react";

export const pageFooterClass =
  "[&_a>p:last-child]:line-clamp-2 [&_a>p:last-child]:whitespace-normal [&_a>p:last-child]:text-pretty";

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <DocsTitle className="text-[2.25rem] leading-[1.1] font-semibold tracking-[-0.02em] text-balance">
      {children}
    </DocsTitle>
  );
}

export function PageDescription({ children }: { children: ReactNode }) {
  return (
    <DocsDescription className="mb-4 max-w-[62ch] text-[17px] leading-relaxed text-pretty text-muted-foreground">
      {children}
    </DocsDescription>
  );
}

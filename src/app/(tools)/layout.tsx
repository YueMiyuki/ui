import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import { siteMetadata } from "@/site/i18n/metadata";
import { ArtRaster, rootClassName, ThemeScript } from "@/site/root-document";

export const metadata: Metadata = siteMetadata("en");

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={rootClassName} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <ArtRaster />
      </body>
    </html>
  );
}

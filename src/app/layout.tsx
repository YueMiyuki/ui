import { GeistMono } from "geist/font/mono";
import { GeistPixelCircle, GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "@/site/art-files";
import { ArtRaster } from "@/site/art-raster";
import { SITE_URL } from "@/site/registry";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "miyuki-ui — components with the stillness of snow and the motion of water",
    template: "%s — miyuki-ui",
  },
  description:
    "A library of React components for Next.js: backgrounds and effects, everyday controls, charts, AI blocks and full templates. Copy the source and make it yours.",
  openGraph: { type: "website", siteName: "miyuki-ui" },
  twitter: { card: "summary_large_image" },
};

const themeScript = `(function(){try{var q=location.pathname.indexOf("/preview/")===0?new URLSearchParams(location.search).get("theme"):null;var t=q==="light"||q==="dark"?q:localStorage.getItem("miyuki-theme");var d=t==="dark"||t==="light"?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}try{var h=document.documentElement;if("mozInnerScreenX" in window){h.setAttribute("data-art-hold","");setTimeout(function(){h.removeAttribute("data-art-hold")},8000)}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelCircle.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {children}
        <ArtRaster />
      </body>
    </html>
  );
}

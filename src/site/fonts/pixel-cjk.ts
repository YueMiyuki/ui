import { GeistPixelSquare } from "geist/font/pixel";
import localFont from "next/font/local";
import type { CSSProperties } from "react";

const pixelCjk = localFont({
  src: "./pixel-cjk.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

export const zhFontStyle = {
  "--font-pixel-zh": `${GeistPixelSquare.style.fontFamily.split(",")[0]}, ${pixelCjk.style.fontFamily}`,
} as CSSProperties;

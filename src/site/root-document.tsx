import { GeistMono } from "geist/font/mono";
import { GeistPixelCircle, GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import "@/site/art-files";

export { ArtRaster } from "@/site/art-raster";

const themeScript = `(function(){try{var q=location.pathname.indexOf("/preview/")===0?new URLSearchParams(location.search).get("theme"):null;var t=q==="light"||q==="dark"||q==="ink"?q:localStorage.getItem("miyuki-theme");var d=t==="dark"||t==="ink"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;c.toggle("dark",d);c.toggle("ink",t==="ink")}catch(e){}try{var h=document.documentElement;if("mozInnerScreenX" in window){h.setAttribute("data-art-hold","");setTimeout(function(){h.removeAttribute("data-art-hold")},8000)}}catch(e){}})()`;

export const rootClassName = `${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelCircle.variable} h-full antialiased`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

import { artFiles } from "@/registry/__generated__/art";

(globalThis as { __miyukiArtFiles?: ReadonlySet<string> }).__miyukiArtFiles = artFiles;

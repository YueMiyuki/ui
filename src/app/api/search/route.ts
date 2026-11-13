import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/site/docs/source";

export const { GET } = createFromSource(source, { language: "english" });

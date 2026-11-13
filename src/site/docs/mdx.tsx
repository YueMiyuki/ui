import { CodeBlockTabs } from "fumadocs-ui/components/codeblock";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { MdxPre } from "@/site/docs/code-block";
import { AddByUrl, Code, Count, RegistryAdd, RegistryJson, ThemeCss, UtilsSource } from "@/site/docs/mdx-blocks";
import { Tab, Tabs } from "@/site/docs/tabs";

function CodeTabs({ className, ...props }: ComponentProps<typeof CodeBlockTabs>) {
  return <CodeBlockTabs {...props} className={cn("bg-muted/40 [&_figure]:bg-transparent", className)} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    pre: MdxPre,
    CodeBlockTabs: CodeTabs,
    Tabs,
    Tab,
    Steps,
    Step,
    TypeTable,
    Files,
    Folder,
    File,
    Code,
    Count,
    RegistryJson,
    RegistryAdd,
    AddByUrl,
    ThemeCss,
    UtilsSource,
    ...components,
  } satisfies MDXComponents;
}

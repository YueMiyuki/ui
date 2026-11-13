"use client";

import { Tree, TreeItem } from "@/components/miyuki-ui/tree-view";

export default function TreeViewDemo() {
  return (
    <Tree
      aria-label="Project files"
      selectionMode="single"
      defaultSelectedKeys={["button.tsx"]}
      defaultExpandedKeys={["src", "components"]}
      className="max-w-xs"
    >
      <TreeItem id="src" title="src">
        <TreeItem id="components" title="components">
          <TreeItem id="button.tsx" title="button.tsx" />
          <TreeItem id="button.module.css" title="button.module.css" />
        </TreeItem>
        <TreeItem id="lib" title="lib">
          <TreeItem id="forecast.ts" title="forecast.ts" />
          <TreeItem id="format-date.ts" title="format-date.ts" />
        </TreeItem>
        <TreeItem id="page.tsx" title="page.tsx" />
      </TreeItem>
      <TreeItem id="README.md" title="README.md" />
      <TreeItem id="package.json" title="package.json" />
    </Tree>
  );
}

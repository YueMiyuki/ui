import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { BookOpen, PanelsTopLeft, Shapes } from "lucide-react";
import { createElement } from "react";
import { registrySource } from "@/site/docs/registry-source";
import { DOCS_HOME } from "@/site/docs/urls";

const docs = defineDocs({ dir: "content/docs" });

const icons = { BookOpen, PanelsTopLeft, Shapes };

export const source = loader(
  { docs: docs.toFumadocsSource(), registry: registrySource() },
  {
    baseUrl: DOCS_HOME,
    pageTree: {
      transformers: [
        {
          file(node, filePath) {
            return filePath && /^(components|templates)\/index\.mdx$/.test(filePath)
              ? { ...node, name: "Overview" }
              : node;
          },
        },
      ],
    },
    icon(name) {
      if (name && name in icons) return createElement(icons[name as keyof typeof icons]);
    },
  },
);

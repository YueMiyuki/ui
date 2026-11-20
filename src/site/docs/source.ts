import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { BookOpen, PanelsTopLeft, Shapes } from "lucide-react";
import { createElement } from "react";
import { registrySource } from "@/site/docs/registry-source";
import { DOCS_HOME } from "@/site/docs/urls";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/site/i18n/config";
import { dictionaries } from "@/site/i18n/dictionaries";

const docs = defineDocs({ dir: "content/docs" });

const icons = { BookOpen, PanelsTopLeft, Shapes };

export const i18n = defineI18n({
  languages: [...LOCALES],
  defaultLanguage: DEFAULT_LOCALE,
  hideLocale: "default-locale",
  parser: "dot",
});

export const source = loader(
  { docs: docs.toFumadocsSource(), registry: registrySource() },
  {
    baseUrl: DOCS_HOME,
    i18n,
    pageTree: {
      transformers: [
        {
          file(node, filePath) {
            if (!filePath || !/^(components|templates)\/index\.mdx$/.test(filePath)) return node;
            const locale = isLocale(this.locale) ? this.locale : DEFAULT_LOCALE;
            return { ...node, name: dictionaries[locale].docs.overview };
          },
        },
      ],
    },
    icon(name) {
      if (name && name in icons) return createElement(icons[name as keyof typeof icons]);
    },
  },
);

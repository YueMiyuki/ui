import type { StructuredData } from "fumadocs-core/mdx-plugins";
import type { MetaData, PageData, StaticSource, VirtualFile } from "fumadocs-core/source";
import type { TOCItemType } from "fumadocs-core/toc";
import { items } from "@/registry/__generated__/items";
import { CATEGORIES, type RegistryItem } from "@/registry/schema";
import { headingId, type Section, sectionOf } from "@/site/docs/urls";
import { LOCALES, type Locale } from "@/site/i18n/config";
import { type Dictionary, dictionaries } from "@/site/i18n/dictionaries";
import { localizeItem, sortByName } from "@/site/i18n/items";

export interface RegistryPageData extends PageData {
  title: string;
  alias?: string;
  description: string;
  section: Section;
  slug: string | null;
  toc: TOCItemType[];
  structuredData: StructuredData;
}

type RegistryConfig = { pageData: RegistryPageData; metaData: MetaData };

export const docsCategories = [
  ...CATEGORIES.filter((category) => category.id === "foundations"),
  ...CATEGORIES.filter((category) => category.id !== "foundations"),
];

export function localizedCategories(locale: Locale) {
  const names = dictionaries[locale].categories;
  return docsCategories.map((category) => ({ id: category.id, ...names[category.id] }));
}

const icons: Record<Section, string> = { components: "Shapes", templates: "PanelsTopLeft" };

const suffix = (locale: Locale) => (locale === "en" ? "" : `.${locale}`);

function itemPage(source: RegistryItem, locale: Locale, t: Dictionary): VirtualFile<RegistryConfig> {
  const item = localizeItem(source, locale);
  const section = sectionOf(item);
  const toc: TOCItemType[] = [];
  const headings: StructuredData["headings"] = [];
  const contents: StructuredData["contents"] = [{ heading: undefined, content: item.description }];

  if (item.demos.length > 1) {
    for (const demo of item.demos) {
      const id = headingId("demo", demo.name);
      toc.push({ title: demo.title, url: `#${id}`, depth: 2 });
      headings.push({ id, content: demo.title });
    }
  }

  if (item.files.length > 0) {
    toc.push({ title: t.component.install, url: "#install", depth: 2 });
    headings.push({ id: "install", content: t.component.install });
    contents.push({ heading: "install", content: `npx shadcn@latest add @miyuki-ui/${item.slug}` });
  }

  if (item.props.length > 0) {
    toc.push({ title: t.component.props, url: "#props", depth: 2 });
    headings.push({ id: "props", content: t.component.props });
    for (const group of item.props) {
      const id = headingId("props", group.component);
      if (item.props.length > 1) toc.push({ title: group.component, url: `#${id}`, depth: 3 });
      headings.push({ id, content: group.component });
      for (const prop of group.props) contents.push({ heading: id, content: `${prop.name}: ${prop.description}` });
    }
  }

  return {
    type: "page",
    path: `${section}/${item.slug}${suffix(locale)}.mdx`,
    data: {
      title: item.name,
      ...(item.name === source.name ? {} : { alias: source.name }),
      description: item.description,
      section,
      slug: item.slug,
      toc,
      structuredData: { headings, contents },
    },
  };
}

function galleryPage(
  section: Section,
  groups: { id: string; label: string; blurb: string }[],
  locale: Locale,
  t: Dictionary,
): VirtualFile<RegistryConfig> {
  const { title, description } = t.docs[section];
  return {
    type: "page",
    path: `${section}/index${suffix(locale)}.mdx`,
    data: {
      title,
      description,
      section,
      slug: null,
      toc: groups.length > 1 ? groups.map((group) => ({ title: group.label, url: `#${group.id}`, depth: 2 })) : [],
      structuredData: {
        headings: groups.map((group) => ({ id: group.id, content: group.label })),
        contents: [
          { heading: undefined, content: description },
          ...groups.map((group) => ({ heading: group.id, content: group.blurb })),
        ],
      },
    },
  };
}

function sectionMeta(section: Section, pages: string[], locale: Locale, t: Dictionary): VirtualFile<RegistryConfig> {
  const { title, description } = t.docs[section];
  return {
    type: "meta",
    path: `${section}/meta${suffix(locale)}.json`,
    data: { title, description, icon: icons[section], root: true, pages: ["index", ...pages] },
  };
}

function localeFiles(locale: Locale): VirtualFile<RegistryConfig>[] {
  const t = dictionaries[locale];
  const components = items.filter((item) => sectionOf(item) === "components");
  const templates = items.filter((item) => sectionOf(item) === "templates");
  const categories = localizedCategories(locale);
  const ordered = (list: RegistryItem[]) =>
    sortByName(
      list.map((item) => localizeItem(item, locale)),
      locale,
    );
  const groups = categories
    .filter((category) => category.id !== "templates")
    .map((category) => ({ ...category, items: ordered(components.filter((item) => item.category === category.id)) }))
    .filter((group) => group.items.length > 0);
  const templateGroups = categories.filter((category) => category.id === "templates");

  return [
    sectionMeta(
      "components",
      groups.flatMap((group) => [`---${group.label}---`, ...group.items.map((item) => item.slug)]),
      locale,
      t,
    ),
    galleryPage("components", groups, locale, t),
    ...components.map((item) => itemPage(item, locale, t)),
    sectionMeta(
      "templates",
      ordered(templates).map((item) => item.slug),
      locale,
      t,
    ),
    galleryPage("templates", templates.length > 0 ? templateGroups : [], locale, t),
    ...templates.map((item) => itemPage(item, locale, t)),
  ];
}

export function registrySource(): StaticSource<RegistryConfig> {
  return { files: LOCALES.flatMap(localeFiles) };
}

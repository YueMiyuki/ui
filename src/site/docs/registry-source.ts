import type { StructuredData } from "fumadocs-core/mdx-plugins";
import type { MetaData, PageData, StaticSource, VirtualFile } from "fumadocs-core/source";
import type { TOCItemType } from "fumadocs-core/toc";
import { items } from "@/registry/__generated__/items";
import { CATEGORIES, type RegistryItem } from "@/registry/schema";
import { headingId, type Section, sectionOf } from "@/site/docs/urls";

export interface RegistryPageData extends PageData {
  title: string;
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

const sections: Record<Section, { title: string; description: string; icon: string }> = {
  components: {
    title: "Components",
    description: "Every component, by category, with a live preview.",
    icon: "Shapes",
  },
  templates: {
    title: "Templates",
    description: "Full pages to start a product, a portfolio or a launch.",
    icon: "PanelsTopLeft",
  },
};

function itemPage(item: RegistryItem): VirtualFile<RegistryConfig> {
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
    toc.push({ title: "Install", url: "#install", depth: 2 });
    headings.push({ id: "install", content: "Install" });
    contents.push({ heading: "install", content: `npx shadcn@latest add @miyuki-ui/${item.slug}` });
  }

  if (item.props.length > 0) {
    toc.push({ title: "Props", url: "#props", depth: 2 });
    headings.push({ id: "props", content: "Props" });
    for (const group of item.props) {
      const id = headingId("props", group.component);
      if (item.props.length > 1) toc.push({ title: group.component, url: `#${id}`, depth: 3 });
      headings.push({ id, content: group.component });
      for (const prop of group.props) contents.push({ heading: id, content: `${prop.name}: ${prop.description}` });
    }
  }

  return {
    type: "page",
    path: `${section}/${item.slug}.mdx`,
    data: {
      title: item.name,
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
): VirtualFile<RegistryConfig> {
  const { title, description } = sections[section];
  return {
    type: "page",
    path: `${section}/index.mdx`,
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

function sectionMeta(section: Section, pages: string[]): VirtualFile<RegistryConfig> {
  const { title, description, icon } = sections[section];
  return {
    type: "meta",
    path: `${section}/meta.json`,
    data: { title, description, icon, root: true, pages: ["index", ...pages] },
  };
}

export function registrySource(): StaticSource<RegistryConfig> {
  const components = items.filter((item) => sectionOf(item) === "components");
  const templates = items.filter((item) => sectionOf(item) === "templates");
  const groups = docsCategories
    .filter((category) => category.id !== "templates")
    .map((category) => ({ ...category, items: components.filter((item) => item.category === category.id) }))
    .filter((group) => group.items.length > 0);
  const templateGroups = docsCategories.filter((category) => category.id === "templates");

  return {
    files: [
      sectionMeta(
        "components",
        groups.flatMap((group) => [`---${group.label}---`, ...group.items.map((item) => item.slug)]),
      ),
      galleryPage("components", groups),
      ...components.map(itemPage),
      sectionMeta(
        "templates",
        templates.map((item) => item.slug),
      ),
      galleryPage("templates", templates.length > 0 ? templateGroups : []),
      ...templates.map(itemPage),
    ],
  };
}

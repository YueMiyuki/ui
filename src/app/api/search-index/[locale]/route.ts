import { cacheLife } from "next/cache";
import { source } from "@/site/docs/source";
import { isLocale, LOCALES, type Locale } from "@/site/i18n/config";
import type { SearchIndexRecord } from "@/site/search-index";

interface TreeNode {
  type: string;
  name?: unknown;
  url?: string;
  index?: { url: string };
  children?: TreeNode[];
}

interface Structured {
  headings: { id: string; content: string }[];
  contents: { heading?: string; content: string }[];
}

interface PageData {
  title?: string;
  alias?: string;
  description?: string;
  structuredData?: Structured | (() => Promise<Structured>);
  load?: () => Promise<{ structuredData?: Structured }>;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

function label(name: unknown) {
  return typeof name === "string" && name.length > 0 ? name : null;
}

function breadcrumbs(root: TreeNode) {
  const out = new Map<string, string[]>();
  const walk = (folder: TreeNode, path: string[]) => {
    if (folder.index && !out.has(folder.index.url)) out.set(folder.index.url, path);
    let current = path;
    for (const node of folder.children ?? []) {
      const name = label(node.name);
      if (node.type === "separator") current = name ? [...path, name] : path;
      else if (node.type === "folder") walk(node, name ? [...current, name] : current);
      else if (node.url && !out.has(node.url)) out.set(node.url, current);
    }
  };
  walk(root, []);
  return out;
}

async function structuredOf(data: PageData): Promise<Structured> {
  if (typeof data.structuredData === "function") return data.structuredData();
  if (data.structuredData) return data.structuredData;
  if (typeof data.load === "function") return (await data.load()).structuredData ?? { headings: [], contents: [] };
  return { headings: [], contents: [] };
}

async function buildIndex(locale: Locale): Promise<SearchIndexRecord[]> {
  "use cache";
  cacheLife("max");
  const crumbs = breadcrumbs(source.getPageTree(locale) as unknown as TreeNode);
  return Promise.all(
    source.getPages(locale).map(async (page) => {
      const data = page.data as PageData;
      const { headings, contents } = await structuredOf(data);
      const kept = headings.filter((heading) => heading.id !== "install");
      const position = new Map(kept.map((heading, i) => [heading.id, i]));
      const record: SearchIndexRecord = { u: page.url, t: data.title ?? page.url };
      if (data.alias) record.a = data.alias;
      const trail = crumbs.get(page.url);
      if (trail && trail.length > 0) record.b = trail.join(" / ");
      if (data.description) record.d = data.description;
      if (kept.length > 0) record.h = kept.map((heading) => [heading.id, heading.content]);
      const entries: [number, string][] = [];
      for (const entry of contents) {
        if (entry.heading === "install") continue;
        const at = entry.heading == null ? -1 : (position.get(entry.heading) ?? -1);
        if (at === -1 && entry.content === data.description) continue;
        entries.push([at, entry.content]);
      }
      if (entries.length > 0) record.c = entries;
      return record;
    }),
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  return Response.json(await buildIndex(locale));
}

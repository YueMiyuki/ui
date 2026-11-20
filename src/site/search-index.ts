import type { Locale } from "@/site/i18n/config";

export interface SearchIndexRecord {
  u: string;
  t: string;
  a?: string;
  b?: string;
  d?: string;
  h?: [id: string, text: string][];
  c?: [heading: number, text: string][];
}

interface Entry {
  text: string;
  norm: string;
  heading: boolean;
  anchor: string;
  prop: { name: string; norm: string; description: string } | null;
  order: number;
}

interface Prepared {
  record: SearchIndexRecord;
  order: number;
  title: string;
  alias: string;
  description: string;
  headings: Entry[];
  contents: Entry[];
  all: string;
}

export interface SearchIndex {
  locale: Locale;
  pages: Prepared[];
}

export interface SearchIndexChild {
  id: string;
  kind: "heading" | "prop" | "text";
  text: string;
  description?: string;
  href: string;
}

export interface SearchIndexHit {
  id: string;
  title: string;
  breadcrumb?: string;
  href: string;
  children: SearchIndexChild[];
}

export function normalize(text: string) {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function plainMarkdown(text: string) {
  return text
    .split("\n")
    .filter((line) => !/^\s*\|?\s*:?-{2,}/.test(line))
    .map((line) =>
      line.trim().startsWith("|")
        ? line
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join(" · ")
        : line,
    )
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function prepare(records: SearchIndexRecord[], locale: Locale): SearchIndex {
  const pages = records.map((record, order): Prepared => {
    const headingIds = (record.h ?? []).map(([id]) => id);
    const headings = (record.h ?? []).map(([id, raw], i): Entry => {
      const text = plainMarkdown(raw);
      return { text, norm: normalize(text), heading: true, anchor: `${record.u}#${id}`, prop: null, order: i };
    });
    const contents = (record.c ?? []).map(([at, raw], i): Entry => {
      const text = plainMarkdown(raw);
      const id = at >= 0 ? headingIds[at] : undefined;
      const split = id?.startsWith("props") ? /^([^\s:]+): ([\s\S]*)$/.exec(text) : null;
      return {
        text,
        norm: normalize(text),
        heading: false,
        anchor: id ? `${record.u}#${id}` : record.u,
        prop: split ? { name: split[1], norm: normalize(split[1]), description: split[2] } : null,
        order: i,
      };
    });
    const title = normalize(record.t);
    const alias = normalize(record.a ?? "");
    const description = normalize(record.d ?? "");
    const all = [title, alias, description, ...headings.map((h) => h.norm), ...contents.map((c) => c.norm)].join("\n");
    return { record, order, title, alias, description, headings, contents, all };
  });
  return { locale, pages };
}

const loading = new Map<Locale, Promise<SearchIndex>>();
const loaded = new Map<Locale, SearchIndex>();

export function peekSearchIndex(locale: Locale) {
  return loaded.get(locale);
}

export function loadSearchIndex(locale: Locale) {
  let pending = loading.get(locale);
  if (!pending) {
    pending = fetch(`/api/search-index/${locale}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Search index answered ${response.status}`);
        return response.json() as Promise<SearchIndexRecord[]>;
      })
      .then((records) => {
        const index = prepare(records, locale);
        loaded.set(locale, index);
        return index;
      });
    pending.catch(() => loading.delete(locale));
    loading.set(locale, pending);
  }
  return pending;
}

function startsWord(text: string, term: string) {
  for (let at = text.indexOf(term); at !== -1; at = text.indexOf(term, at + 1)) {
    if (at === 0 || !/[\p{L}\p{N}]/u.test(text[at - 1])) return true;
  }
  return false;
}

export function searchIndex(index: SearchIndex, query: string, limit = 20): SearchIndexHit[] {
  const whole = normalize(query);
  const terms = whole.split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  const every = (text: string) => terms.every((term) => text.includes(term));
  const some = (text: string) => terms.some((term) => text.includes(term));
  const titleScore = (title: string) => {
    if (!title) return 0;
    if (title === whole) return 1000;
    if (title.startsWith(whole)) return 600;
    if (terms.every((term) => startsWord(title, term))) return 400;
    return every(title) ? 250 : 0;
  };

  const scored: { page: Prepared; score: number }[] = [];
  for (const page of index.pages) {
    if (!every(page.all)) continue;
    let score = Math.max(titleScore(page.title), titleScore(page.alias));
    if (page.description && every(page.description)) score += 120;
    let headingHits = 0;
    for (const heading of page.headings) if (headingHits < 3 && every(heading.norm)) headingHits++;
    score += headingHits * 90;
    let fromContents = 0;
    for (const entry of page.contents) {
      if (fromContents >= 180) break;
      if (entry.prop && some(entry.prop.norm)) fromContents += 60;
      else if (every(entry.norm)) fromContents += 30;
    }
    score += Math.min(fromContents, 180);
    scored.push({ page, score });
  }

  scored.sort((a, b) => b.score - a.score || a.page.title.length - b.page.title.length || a.page.order - b.page.order);

  return scored.slice(0, limit).map(({ page }) => {
    const candidates = [...page.headings, ...page.contents]
      .filter((entry) => some(entry.norm))
      .map((entry) => ({ entry, all: every(entry.norm) }))
      .sort(
        (a, b) =>
          Number(b.all) - Number(a.all) ||
          Number(b.entry.heading) - Number(a.entry.heading) ||
          a.entry.order - b.entry.order,
      )
      .slice(0, 3);
    return {
      id: page.record.u,
      title: page.record.t,
      breadcrumb: page.record.b,
      href: page.record.u,
      children: candidates.map(({ entry }) => ({
        id: `${page.record.u}::${entry.heading ? "h" : "c"}${entry.order}`,
        kind: entry.heading ? "heading" : entry.prop ? "prop" : "text",
        text: entry.prop ? entry.prop.name : entry.text,
        description: entry.prop?.description,
        href: entry.anchor,
      })),
    };
  });
}

"use client";

import { AlignLeft, FileText, Hash, Palette, PanelsTopLeft, Shapes, SquareTerminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ComponentType, lazy, type ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { RouterProvider } from "react-aria-components";
import type { SearchBarItem, SearchBarStrings } from "@/components/miyuki-ui/search-bar";
import { docsPath, sectionHref } from "@/site/docs/urls";
import type { Locale } from "@/site/i18n/config";
import { useDictionary, useLocale } from "@/site/i18n/context";
import { fill } from "@/site/i18n/format";
import {
  loadSearchIndex,
  normalize,
  peekSearchIndex,
  type SearchIndex,
  type SearchIndexHit,
  searchIndex,
} from "@/site/search-index";

export interface SiteSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links?: [name: string, href: string][];
}

function Mono({ text, query }: { text: string; query: string }) {
  const terms = normalize(query).split(" ").filter(Boolean);
  const lower = normalize(text);
  if (lower.length !== text.length || !terms.some((term) => lower.includes(term))) {
    return <span className="font-mono text-[13px]">{text}</span>;
  }
  const marks = new Array<boolean>(text.length).fill(false);
  for (const term of terms) {
    for (let at = lower.indexOf(term); at !== -1; at = lower.indexOf(term, at + term.length)) {
      marks.fill(true, at, at + term.length);
    }
  }
  const parts: ReactNode[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || marks[i] !== marks[start]) {
      const piece = text.slice(start, i);
      parts.push(
        marks[start] ? (
          <mark key={start} className="bg-transparent font-medium text-brand-strong">
            {piece}
          </mark>
        ) : (
          piece
        ),
      );
      start = i;
    }
  }
  return <span className="font-mono text-[13px]">{parts}</span>;
}

function toItems(hits: SearchIndexHit[], query: string): SearchBarItem[] {
  return hits.flatMap((hit) => [
    { id: hit.id, title: hit.title, meta: hit.breadcrumb, href: hit.href, icon: <FileText /> },
    ...hit.children.map(
      (child): SearchBarItem =>
        child.kind === "heading"
          ? { id: child.id, title: child.text, href: child.href, icon: <Hash />, depth: 1 }
          : child.kind === "prop"
            ? {
                id: child.id,
                title: <Mono text={child.text} query={query} />,
                textValue: child.text,
                description: child.description,
                href: child.href,
                icon: <AlignLeft />,
                depth: 1,
              }
            : { id: child.id, title: child.text, href: child.href, icon: <AlignLeft />, depth: 1 },
    ),
  ]);
}

type SearchDialogComponent = typeof import("@/components/miyuki-ui/search-bar").SearchDialog;

function makeBody(SearchDialog: SearchDialogComponent) {
  return function SiteSearchBody({ open, onOpenChange, links = [] }: SiteSearchDialogProps) {
    const locale = useLocale();
    const t = useDictionary();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [loaded, setLoaded] = useState<SearchIndex | null>(null);
    const [failed, setFailed] = useState<Locale | null>(null);
    const index = loaded?.locale === locale ? loaded : (peekSearchIndex(locale) ?? null);

    useEffect(() => {
      if (!open || peekSearchIndex(locale)) return;
      let live = true;
      loadSearchIndex(locale).then(
        (ready) => {
          if (live) setLoaded(ready);
        },
        () => {
          if (live) setFailed(locale);
        },
      );
      return () => {
        live = false;
      };
    }, [open, locale]);

    const searching = query.trim() !== "";
    const results = useMemo(
      () => (searching && index ? toItems(searchIndex(index, query), query) : null),
      [index, query, searching],
    );

    const strings = useMemo((): Partial<SearchBarStrings> => {
      const s = t.search;
      return {
        searching: s.searching,
        results: (count) => (count === 1 ? s.resultOne : fill(s.resultMany, { count })),
        noResults: s.noResults,
        empty: (value) => fill(s.empty, { query: value }),
        emptyHint: s.emptyHint,
        failed: s.failed,
        staleNotice: (value) => fill(s.staleNotice, { query: value }),
        retry: s.retry,
        clear: s.clear,
        navigate: s.navigate,
        open: s.open,
        close: s.close,
        resultsLabel: s.resultsLabel,
        suggestionsLabel: s.suggestionsLabel,
      };
    }, [t]);

    const suggestions = useMemo(() => {
      if (links.length === 0) return undefined;
      const icons: { [href: string]: ReactNode } = {
        [sectionHref("components", locale)]: <Shapes />,
        [sectionHref("templates", locale)]: <PanelsTopLeft />,
        [docsPath(locale, "/installation")]: <SquareTerminal />,
        [docsPath(locale, "/theming")]: <Palette />,
      };
      return [
        {
          id: "jump",
          title: t.search.jumpTo,
          items: links.map(([name, href]) => ({ id: href, title: name, href, icon: icons[href] ?? <FileText /> })),
        },
      ];
    }, [links, locale, t]);

    const failedHere = failed === locale && !index;

    return (
      <RouterProvider navigate={(href) => router.push(href)}>
        <SearchDialog
          isOpen={open}
          onOpenChange={onOpenChange}
          shortcut={null}
          aria-label={t.nav.search}
          placeholder={t.fumadocs["Search(search dialog)"]}
          value={query}
          onChange={setQuery}
          results={results}
          suggestions={suggestions}
          isLoading={searching && !index && !failedHere}
          error={searching && failedHere}
          onRetry={() => {
            setFailed(null);
            loadSearchIndex(locale).then(setLoaded, () => setFailed(locale));
          }}
          strings={strings}
        />
      </RouterProvider>
    );
  };
}

let body: Promise<{ default: ComponentType<SiteSearchDialogProps> }> | null = null;

function loadBody() {
  body ??= import("@/components/miyuki-ui/search-bar").then((bar) => ({ default: makeBody(bar.SearchDialog) }));
  return body;
}

const Body = lazy(loadBody);

export function preloadSiteSearch(locale: Locale) {
  void loadBody();
  loadSearchIndex(locale).catch(() => {});
}

export function SiteSearchDialog(props: SiteSearchDialogProps) {
  const [opened, setOpened] = useState(props.open);
  if (props.open && !opened) setOpened(true);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 2000));
    idle(() => void loadBody());
  }, []);

  if (!opened) return null;
  return (
    <Suspense fallback={null}>
      <Body {...props} />
    </Suspense>
  );
}

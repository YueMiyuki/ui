import { Heading } from "fumadocs-ui/components/heading";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/notebook/page";
import { cn } from "@/lib/utils";
import { ComponentTile } from "@/site/component-tile";
import { PageDescription, PageTitle } from "@/site/docs/page-parts";
import { localizedCategories, type RegistryPageData } from "@/site/docs/registry-source";
import { sectionOf } from "@/site/docs/urls";
import type { Locale } from "@/site/i18n/config";
import { dictionaries } from "@/site/i18n/dictionaries";
import { fill } from "@/site/i18n/format";
import { sortByName } from "@/site/i18n/items";
import { catalogueCounts, items, summarize } from "@/site/registry";
import { DocsFooter } from "@/site/site-footer";

export function GalleryPage({ data, locale }: { data: RegistryPageData; locale: Locale }) {
  const t = dictionaries[locale].docs;
  const inSection = items.filter((item) => sectionOf(item) === data.section);
  const groups = localizedCategories(locale)
    .map((category) => ({
      ...category,
      items: sortByName(
        inSection.filter((item) => item.category === category.id).map((item) => summarize(item, locale)),
        locale,
      ),
    }))
    .filter((group) => group.items.length > 0);
  const count = catalogueCounts()[data.section];
  const several = groups.length > 1;

  return (
    <DocsPage toc={data.toc} breadcrumb={{ enabled: false }} footer={{ component: <DocsFooter /> }}>
      <PageTitle>{data.title}</PageTitle>
      <PageDescription>
        {count === 0
          ? fill(t.none, { description: data.description })
          : fill(t[data.section][count === 1 ? "one" : "other"], { count })}
      </PageDescription>
      <DocsBody>
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={several ? group.id : undefined} className="not-prose mb-14">
            {several ? (
              <>
                <Heading
                  as="h2"
                  id={group.id}
                  className="text-xl leading-tight font-semibold tracking-[-0.01em] text-foreground zh:tracking-normal"
                >
                  {group.label}
                  <span className="ml-2.5 text-sm font-normal tracking-normal text-muted-foreground tabular-nums">
                    {group.items.length}
                  </span>
                </Heading>
                <p className="mt-1 text-sm text-muted-foreground">{fill(t.blurb, { blurb: group.blurb })}</p>
              </>
            ) : null}
            <div
              className={cn(
                "grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2",
                several && "mt-6",
                data.section === "components" && "xl:grid-cols-3",
              )}
            >
              {group.items.map((item) => (
                <ComponentTile key={item.slug} item={item} locale={locale} />
              ))}
            </div>
          </section>
        ))}
      </DocsBody>
    </DocsPage>
  );
}

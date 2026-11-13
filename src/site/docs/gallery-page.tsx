import { Heading } from "fumadocs-ui/components/heading";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/notebook/page";
import { cn } from "@/lib/utils";
import { ComponentTile } from "@/site/component-tile";
import { PageDescription, PageTitle } from "@/site/docs/page-parts";
import { docsCategories, type RegistryPageData } from "@/site/docs/registry-source";
import { sectionOf } from "@/site/docs/urls";
import { catalogueCounts, items, summarize } from "@/site/registry";
import { DocsFooter } from "@/site/site-footer";

export function GalleryPage({ data }: { data: RegistryPageData }) {
  const inSection = items.filter((item) => sectionOf(item) === data.section);
  const groups = docsCategories
    .map((category) => ({
      ...category,
      items: inSection.filter((item) => item.category === category.id).map(summarize),
    }))
    .filter((group) => group.items.length > 0);
  const noun = data.section === "templates" ? "template" : "component";
  const count = catalogueCounts()[data.section];
  const several = groups.length > 1;

  return (
    <DocsPage toc={data.toc} breadcrumb={{ enabled: false }} footer={{ component: <DocsFooter /> }}>
      <PageTitle>{data.title}</PageTitle>
      <PageDescription>
        {count === 0
          ? `${data.description} None are published yet.`
          : `${count} ${noun}${count === 1 ? "" : "s"}. Copy the source into your project and make it yours.`}
      </PageDescription>
      <DocsBody>
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={several ? group.id : undefined} className="not-prose mb-14">
            {several ? (
              <>
                <Heading
                  as="h2"
                  id={group.id}
                  className="text-xl leading-tight font-semibold tracking-[-0.01em] text-foreground"
                >
                  {group.label}
                  <span className="ml-2.5 text-sm font-normal tracking-normal text-muted-foreground tabular-nums">
                    {group.items.length}
                  </span>
                </Heading>
                <p className="mt-1 text-sm text-muted-foreground">{group.blurb}.</p>
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
                <ComponentTile key={item.slug} item={item} />
              ))}
            </div>
          </section>
        ))}
      </DocsBody>
    </DocsPage>
  );
}

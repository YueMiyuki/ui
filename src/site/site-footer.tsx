import { flattenTree } from "fumadocs-core/page-tree";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { source } from "@/site/docs/source";
import { categoryHref, docsHref, GITHUB_URL, sectionHref } from "@/site/docs/urls";
import { HomeLink } from "@/site/home-link";
import { catalogueCounts, categoryGroups, items } from "@/site/registry";
import { ThemeToggle } from "@/site/theme-toggle";

type FooterLink = { href: string; label: ReactNode; kind?: "external" | "file" };
type FooterColumn = { title: string; links: FooterLink[] };

const templatePicks = ["resort-status", "field-journal", "studio-ledger", "kanban-board", "coding-assistant"];

const linkClass =
  "-mx-1 inline-flex rounded-sm px-1 py-1 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring";

function guideLinks(): FooterLink[] {
  const guides = new Set(
    source
      .getPages()
      .filter((page) => page.type === "docs")
      .map((page) => page.url),
  );
  return flattenTree(source.getPageTree().children)
    .filter((node) => guides.has(node.url))
    .map((node) => ({ href: node.url, label: node.name }));
}

function componentLinks(): FooterLink[] {
  const groups = categoryGroups().filter((group) => group.id !== "templates" && group.id !== "foundations");
  const largest = new Set(
    [...groups]
      .sort((a, b) => b.items.length - a.items.length)
      .slice(0, 6)
      .map((group) => group.id),
  );
  return [
    ...groups
      .filter((group) => largest.has(group.id))
      .map((group) => ({ href: categoryHref(group.id), label: group.label })),
    { href: sectionHref("components"), label: "All components" },
  ];
}

function templateLinks(): FooterLink[] {
  const templates = items.filter((item) => item.category === "templates");
  const picks = templatePicks
    .map((slug) => templates.find((item) => item.slug === slug))
    .filter((item) => item != null);
  return [
    ...[...new Set([...picks, ...templates])].slice(0, 5).map((item) => ({ href: docsHref(item), label: item.name })),
    { href: sectionHref("templates"), label: "All templates" },
  ];
}

function columns(): FooterColumn[] {
  const templates = items.some((item) => item.category === "templates");
  return [
    { title: "Get started", links: guideLinks() },
    { title: "Components", links: componentLinks() },
    ...(templates ? [{ title: "Templates", links: templateLinks() }] : []),
    {
      title: "Project",
      links: [
        { href: GITHUB_URL, label: "GitHub", kind: "external" },
        { href: `${GITHUB_URL}/issues`, label: "Issues", kind: "external" },
        { href: "/r/registry.json", label: "Registry index", kind: "file" },
      ],
    },
  ];
}

function FooterAnchor({ link }: { link: FooterLink }) {
  if (link.kind === "external") {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
        {link.label}
      </a>
    );
  }
  if (link.kind === "file") {
    return (
      <a href={link.href} className={linkClass}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={linkClass}>
      {link.label}
    </Link>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function GitHubLink({ className }: { className?: string }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-lg px-2 font-mono text-[13px] text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
    >
      <GitHubMark />
      {GITHUB_URL.replace(/^https:\/\/github\.com\//, "")}
    </a>
  );
}

function Counts({ className }: { className?: string }) {
  const { components, templates } = catalogueCounts();
  return (
    <p className={cn("flex items-baseline gap-x-2.5 whitespace-nowrap tabular-nums", className)}>
      <span>
        <span className="font-pixel text-[17px] leading-none text-foreground">{components}</span> components
      </span>
      {templates > 0 ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground/50">
            ·
          </span>
          <span>
            <span className="font-pixel text-[17px] leading-none text-foreground">{templates}</span> templates
          </span>
        </>
      ) : null}
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1240px] px-6 pt-16 pb-8 lg:px-10 lg:pt-20">
        <div className="grid gap-x-12 gap-y-14 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <HomeLink />
            <p className="mt-4 max-w-[21.5rem] text-sm leading-relaxed text-balance text-muted-foreground">
              React components for Next.js and Tailwind&nbsp;CSS that you copy into your project and own.
            </p>
            <div className="mt-5 flex items-center gap-1">
              <GitHubLink className="-ml-2" />
              <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
              <ThemeToggle className="size-8" />
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 xl:col-span-8">
            {columns().map((column) => (
              <div key={column.title} className="min-w-0">
                <h2 className="text-sm font-medium text-foreground">{column.title}</h2>
                <ul className="mt-3 space-y-1">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <FooterAnchor link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <p>Built with Next.js, Tailwind CSS, React Aria and Motion, and set in Geist.</p>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 whitespace-nowrap lg:justify-end">
            <Counts />
            <a href="#top" className={cn(linkClass, "text-[13px]")}>
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function DocsFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border pt-6 text-[13px] text-muted-foreground">
      <HomeLink />
      <GitHubLink />
      <Counts className="sm:ml-auto" />
    </footer>
  );
}

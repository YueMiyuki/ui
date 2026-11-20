"use client";

import { Popover, PopoverContent, PopoverTrigger } from "fumadocs-ui/components/ui/popover";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps, type ReactNode, Suspense, useState } from "react";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";
import { DOCS_HOME, docsPath, GITHUB_URL, type Section, sectionHref, sectionPath } from "@/site/docs/urls";
import { HomeLink } from "@/site/home-link";
import { useDictionary, useLocale } from "@/site/i18n/context";
import { stripLocale } from "@/site/i18n/href";
import { iconButtonClass } from "@/site/icon-button";
import { LanguageSwitch } from "@/site/language-switch";
import { preloadSiteSearch } from "@/site/search-dialog";
import { ThemeToggle } from "@/site/theme-toggle";

const inSection = (pathname: string, section: Section) =>
  pathname === sectionPath(section) || pathname.startsWith(`${sectionPath(section)}/`);

function useSiteLinks() {
  const locale = useLocale();
  const t = useDictionary();
  return [
    {
      href: sectionHref("components", locale),
      label: t.nav.components,
      match: (p: string) => inSection(stripLocale(p), "components"),
    },
    {
      href: sectionHref("templates", locale),
      label: t.nav.templates,
      match: (p: string) => inSection(stripLocale(p), "templates"),
    },
    {
      href: docsPath(locale),
      label: t.nav.getStarted,
      match: (p: string) => {
        const path = stripLocale(p);
        return (
          (path === DOCS_HOME || path.startsWith(`${DOCS_HOME}/`)) &&
          !inSection(path, "components") &&
          !inSection(path, "templates")
        );
      },
    },
  ];
}

function Links({ pathname, className }: { pathname: string | null; className?: string }) {
  const siteLinks = useSiteLinks();
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {siteLinks.map((link) => {
        const current = pathname != null && link.match(pathname);
        return (
          <li key={link.href} className="relative flex h-full items-center">
            <Link
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-md px-2.5 text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring data-[aim]:text-foreground",
                current && "text-foreground",
              )}
            >
              {link.label}
            </Link>
            {current ? (
              <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-brand" />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function CurrentLinks(props: { className?: string }) {
  return <Links pathname={usePathname()} {...props} />;
}

function NavLinks(props: { className?: string }) {
  return (
    <Suspense fallback={<Links pathname={null} {...props} />}>
      <CurrentLinks {...props} />
    </Suspense>
  );
}

function SearchButton() {
  const { setOpenSearch, enabled, hotKey } = useSearchContext();
  const t = useDictionary();
  const locale = useLocale();
  const preload = () => preloadSiteSearch(locale);
  if (!enabled) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpenSearch(true)}
        onPointerEnter={preload}
        onPointerDown={preload}
        onFocus={preload}
        className="hidden h-9 w-60 shrink-0 cursor-default items-center gap-2 rounded-lg border border-input bg-card pr-1.5 pl-3 text-sm text-muted-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 hover:border-border-strong focus-visible:ring-[3px] focus-visible:ring-ring lg:inline-flex"
      >
        <Search aria-hidden="true" className="size-4" />
        {t.nav.search}
        <span className="ml-auto flex gap-0.5">
          {hotKey.map((key, i) => (
            <kbd
              key={i}
              className="inline-grid h-5 min-w-5 place-items-center rounded-sm border border-border bg-muted px-1 font-sans text-[11px] text-muted-foreground"
            >
              {key.display}
            </kbd>
          ))}
        </span>
      </button>
      <button
        type="button"
        aria-label={t.nav.search}
        onClick={() => setOpenSearch(true)}
        onPointerEnter={preload}
        onPointerDown={preload}
        onFocus={preload}
        className={iconButtonClass("size-9 lg:hidden")}
      >
        <Search aria-hidden="true" />
      </button>
    </>
  );
}

function GitHubLink() {
  const t = useDictionary();
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={t.nav.github}
      className={iconButtonClass("size-9")}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    </a>
  );
}

export function SiteHeader({ menu, className, ...props }: ComponentProps<"header"> & { menu?: ReactNode }) {
  return (
    <header
      {...props}
      className={cn(
        "sticky top-0 z-40 h-14 [:root:active-view-transition_&]:[view-transition-name:site-header]",
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-b before:border-border before:bg-background/80 before:backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-2 px-4 sm:px-6">
        <HomeLink />
        <NavLinks className="ml-5 hidden h-full md:flex" />
        <div className="ml-auto flex items-center gap-1">
          <SearchButton />
          <div className="ml-1 flex items-center">
            <LanguageSwitch />
            <GitHubLink />
            <ThemeToggle />
            {menu}
          </div>
        </div>
      </div>
    </header>
  );
}

function HomeMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const siteLinks = useSiteLinks();
  const t = useDictionary();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
        className={iconButtonClass("-mr-1.5 size-9 md:hidden")}
      >
        <MorphIcon shapes={morphIcons.menuClose} shape={open ? "close" : "menu"} />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-60 min-w-0 bg-popover p-1.5 backdrop-blur-none">
        <nav aria-label={t.nav.main}>
          <ul className="flex flex-col gap-px">
            {siteLinks.map((link) => {
              const current = link.match(pathname);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-md px-2.5 py-2 text-sm text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring data-[aim]:bg-accent",
                      current && "bg-brand-soft font-medium hover:bg-brand-soft data-[aim]:bg-brand-soft",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </PopoverContent>
    </Popover>
  );
}

export function HomeHeader(props: ComponentProps<"header">) {
  return <SiteHeader {...props} menu={<HomeMenu />} />;
}

export function HomeContainer({ className, ...props }: ComponentProps<"main">) {
  return (
    <div
      id="nd-home-layout"
      {...(props as ComponentProps<"div">)}
      className={cn("flex min-h-dvh flex-1 flex-col", className)}
    />
  );
}

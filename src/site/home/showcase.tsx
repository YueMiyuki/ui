import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { sectionHref } from "@/site/docs/urls";
import { categoryHref, componentHref } from "@/site/home/links";
import { LiveStage } from "@/site/home/live-stage";
import type { Locale } from "@/site/i18n/config";
import type { Dictionary } from "@/site/i18n/dictionaries";
import { fill } from "@/site/i18n/format";
import { localizeItem } from "@/site/i18n/items";
import { getItem } from "@/site/registry";

type Section = { count: number; locale: Locale; t: Dictionary };

const container = "mx-auto max-w-[1240px] px-6 lg:px-10";
const heading =
  "text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-foreground zh:tracking-normal zh:text-balance";
const quietLink =
  "rounded-sm text-sm font-medium text-brand-strong underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring";

function Head({
  title,
  body,
  href,
  link,
  className,
}: {
  title: string;
  body: string;
  href: string;
  link: string;
  className?: string;
}) {
  return (
    <header className={className}>
      <h2 className={heading}>{title}</h2>
      <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-muted-foreground">{body}</p>
      <Link href={href} className={cn(quietLink, "mt-5 inline-block")}>
        {link}
      </Link>
    </header>
  );
}

function Specimen({
  slug,
  locale,
  demo,
  height,
  scale,
  frame = true,
  caption = true,
  className,
  stageClassName,
}: {
  slug: string;
  locale: Locale;
  demo?: string;
  height: number;
  scale?: number;
  frame?: boolean;
  caption?: boolean;
  className?: string;
  stageClassName?: string;
}) {
  const found = getItem(slug);
  if (!found) return null;
  const item = localizeItem(found, locale);
  return (
    <figure className={cn("min-w-0", className)}>
      <LiveStage
        slug={slug}
        demo={demo}
        layout={item.preview.layout ?? "center"}
        height={height}
        scale={scale}
        className={cn(frame && "rounded-2xl border border-border bg-background", stageClassName)}
      />
      {caption ? (
        <figcaption className="mt-4 text-sm leading-normal">
          <Link
            href={componentHref(slug, locale)}
            className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {item.name}
          </Link>
          <p className="mt-1 max-w-[60ch] text-pretty text-muted-foreground">{item.description}</p>
        </figcaption>
      ) : null}
    </figure>
  );
}

function Rail({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <section className="py-16 lg:py-24">
      <div className={cn(container, "grid gap-x-12 gap-y-10 lg:grid-cols-12")}>
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">{head}</div>
        </div>
        <div className="min-w-0 lg:col-span-8">{children}</div>
      </div>
    </section>
  );
}

function Wide({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <section className="py-16 lg:py-24">
      <div className={container}>
        {head}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export function Backgrounds({ count, locale, t }: Section) {
  const text = t.home.backgrounds;
  return (
    <Rail
      head={
        <Head
          title={text.title}
          body={text.body}
          href={categoryHref("backgrounds", locale)}
          link={fill(text.link, { count })}
        />
      }
    >
      <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
        <Specimen locale={locale} slug="northern-lights" height={400} scale={0.85} className="sm:col-span-2" />
        <Specimen locale={locale} slug="ice-tiles" height={280} scale={0.55} />
        <Specimen locale={locale} slug="whirlpool" height={280} scale={0.55} />
      </div>
    </Rail>
  );
}

function ThemeHalf({
  scope,
  label,
  icon,
  locale,
}: {
  scope: "light" | "dark";
  label: ReactNode;
  icon: ReactNode;
  locale: Locale;
}) {
  return (
    <div className={cn(scope, "bg-background text-foreground")}>
      <p className="flex items-center gap-2 px-6 pt-5 text-sm font-medium text-muted-foreground sm:px-8 [&_svg]:size-4">
        {icon}
        {label}
      </p>
      <Specimen locale={locale} slug="switch" height={210} frame={false} caption={false} />
      <Specimen locale={locale} slug="slider" height={120} frame={false} caption={false} />
      <Specimen locale={locale} slug="segmented-control" height={110} frame={false} caption={false} />
    </div>
  );
}

export function Controls({ count, locale, t }: Section) {
  const text = t.home.controls;
  return (
    <Rail
      head={
        <Head
          title={text.title}
          body={text.body}
          href={categoryHref("inputs", locale)}
          link={fill(text.link, { count })}
        />
      }
    >
      <div className="grid overflow-clip rounded-3xl border border-border sm:grid-cols-2">
        <ThemeHalf scope="light" label={text.day} icon={<Sun aria-hidden="true" />} locale={locale} />
        <ThemeHalf
          scope="dark"
          label={
            <>
              <span className="ink:hidden">{text.night}</span>
              <span className="hidden ink:inline">{text.dark}</span>
            </>
          }
          icon={<Moon aria-hidden="true" />}
          locale={locale}
        />
      </div>
    </Rail>
  );
}

export function Cards({ count, locale, t }: Section) {
  const text = t.home.cards;
  return (
    <Wide
      head={
        <Head
          title={text.title}
          body={text.body}
          href={categoryHref("cards", locale)}
          link={fill(text.link, { count })}
        />
      }
    >
      <div className="grid gap-x-6 gap-y-10 md:grid-cols-3">
        <Specimen locale={locale} slug="tilt-card" height={470} frame={false} />
        <Specimen locale={locale} slug="torch-card" height={470} frame={false} />
        <Specimen locale={locale} slug="card-shuffle" height={470} frame={false} />
      </div>
    </Wide>
  );
}

const textRows: { slug: string; height: number }[] = [
  { slug: "flowing-letters", height: 230 },
  { slug: "typed-phrases", height: 170 },
  { slug: "arriving-text", height: 220 },
  { slug: "decode-text", height: 200 },
];

export function Text({ count, locale, t }: Section) {
  const text = t.home.text;
  return (
    <Wide
      head={
        <Head
          title={text.title}
          body={text.body}
          href={categoryHref("text", locale)}
          link={fill(text.link, { count })}
        />
      }
    >
      <div className="border-b border-border">
        {textRows.map(({ slug, height }) => {
          const found = getItem(slug);
          if (!found) return null;
          const item = localizeItem(found, locale);
          return (
            <div key={slug} className="grid items-center gap-x-10 border-t border-border lg:grid-cols-12">
              <div className="pt-6 lg:col-span-3 lg:py-6">
                <Link
                  href={componentHref(slug, locale)}
                  className="rounded-sm text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-sm leading-normal text-muted-foreground">{item.description}</p>
              </div>
              <Specimen
                locale={locale}
                slug={slug}
                height={height}
                frame={false}
                caption={false}
                className="lg:col-span-9"
              />
            </div>
          );
        })}
      </div>
    </Wide>
  );
}

export function Pickers({ count, locale, t }: Section) {
  const text = t.home.pickers;
  return (
    <Rail
      head={
        <Head
          title={text.title}
          body={text.body}
          href={categoryHref("pickers", locale)}
          link={fill(text.link, { count })}
        />
      }
    >
      <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
        <Specimen
          locale={locale}
          slug="date-calendar"
          demo="range"
          height={480}
          frame={false}
          stageClassName="max-sm:min-h-[340px]!"
        />
        <Specimen locale={locale} slug="color-picker" demo="inline" height={480} frame={false} />
      </div>
    </Rail>
  );
}

export function Charts({ count, locale, t }: Section) {
  const text = t.home.charts;
  return (
    <Wide
      head={
        <Head
          title={text.title}
          body={text.body}
          href={categoryHref("charts", locale)}
          link={fill(text.link, { count })}
        />
      }
    >
      <div className="grid gap-x-6 gap-y-8 lg:grid-cols-12">
        <Specimen
          locale={locale}
          slug="comparison-area"
          height={420}
          frame={false}
          caption={false}
          className="lg:col-span-7"
        />
        <Specimen
          locale={locale}
          slug="ghost-bars"
          height={420}
          frame={false}
          caption={false}
          className="lg:col-span-5"
        />
        <Specimen
          locale={locale}
          slug="area-chart"
          height={380}
          frame={false}
          caption={false}
          className="lg:col-span-4"
        />
        <Specimen
          locale={locale}
          slug="combo-chart"
          height={380}
          frame={false}
          caption={false}
          className="lg:col-span-4"
        />
        <Specimen
          locale={locale}
          slug="channel-bars"
          height={380}
          frame={false}
          caption={false}
          className="lg:col-span-4"
        />
      </div>
    </Wide>
  );
}

export function Index({
  groups,
  locale,
  t,
}: {
  groups: { id: string; label: string; blurb: string; count: number }[];
  locale: Locale;
  t: Dictionary;
}) {
  return (
    <section className="py-16 lg:py-24">
      <div className={container}>
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 className={heading}>{t.home.catalogue}</h2>
          <Link href={sectionHref("components", locale)} className={quietLink}>
            {t.home.allComponents}
          </Link>
        </div>
        <ul className="mt-10 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id} className="min-w-0 border-t border-border">
              <Link
                href={categoryHref(group.id, locale)}
                className="group flex items-baseline gap-4 rounded-sm py-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-foreground transition-transform duration-200 ease-settle group-hover:translate-x-1 group-data-[aim]:translate-x-1">
                    {group.label}
                  </span>
                  <span className="mt-0.5 block text-sm text-pretty text-muted-foreground">{group.blurb}</span>
                </span>
                <span className="font-pixel text-xl text-muted-foreground tabular-nums transition-colors duration-200 group-hover:text-brand-strong group-data-[aim]:text-brand-strong">
                  {group.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

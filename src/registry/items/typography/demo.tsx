"use client";

import { Fragment, type ReactNode, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { em, familyName, type Measured, px, ratio, useMeasured } from "./measure";
import { bodies, displays, families, sizes, stations } from "./specimens";

function SectionHeading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <header className="max-w-2xl">
      <h2 id={id} className="text-xl font-semibold tracking-[-0.015em] text-foreground">
        {title}
      </h2>
      {children ? <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{children}</p> : null}
    </header>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{children}</code>;
}

function Figures({ m, children }: { m: Measured | undefined; children?: ReactNode }) {
  return (
    <span className="tabular-nums">
      {m ? (
        <>
          <span className="text-foreground">{px(m.size)}</span> / {px(m.leading)} px
        </>
      ) : (
        " "
      )}
      {children}
    </span>
  );
}

const temp = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;

function StationTable({ title, utility, className }: { title: string; utility: string; className: string }) {
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold text-foreground">{title}</span>
        <Code>{utility}</Code>
      </figcaption>
      <table className={cn("mt-4 w-full text-sm", className)}>
        <thead>
          <tr className="border-b border-border-strong text-left text-[13px] text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              Station
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              New, cm
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              Depth, cm
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              Low, °C
            </th>
          </tr>
        </thead>
        <tbody>
          {stations.map((s) => (
            <tr key={s.name} className="border-b border-border">
              <th scope="row" className="py-2 pr-3 text-left font-normal text-foreground">
                {s.name}
              </th>
              <td className="py-2 pl-3 text-right">{s.fresh}</td>
              <td className="py-2 pl-3 text-right">{s.depth}</td>
              <td className="py-2 pl-3 text-right">{temp(s.low)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default function TypographyDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const measured = useMeasured(ref);
  const id = useId();

  return (
    <div ref={ref} className="@container mx-auto w-full max-w-5xl text-foreground">
      <p className="max-w-xl text-[15px] leading-relaxed text-pretty text-muted-foreground">
        One family in three cuts, and one scale. Every size, leading and tracking figure here is measured from the text
        as it renders, so it stays true if the theme changes.
      </p>

      <section aria-labelledby={`${id}-families`} className="mt-12">
        <SectionHeading id={`${id}-families`} title="Families" />
        <ul className="mt-6">
          {families.map((f) => {
            const m = measured[`family-${f.id}`];
            return (
              <li
                key={f.id}
                className="grid gap-x-10 gap-y-5 border-t border-border py-8 @3xl:grid-cols-[12rem_minmax(0,1fr)]"
              >
                <span
                  aria-hidden="true"
                  data-measure={`family-${f.id}`}
                  className={cn(
                    f.className,
                    "text-[88px] leading-[0.9] tracking-[-0.02em] text-foreground @3xl:text-[112px]",
                  )}
                >
                  Aa
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-[15px] font-semibold text-foreground">{f.role}</h3>
                    <span className="min-h-5 text-[13px] text-muted-foreground">{m ? familyName(m.family) : null}</span>
                  </div>
                  <p className="mt-1.5 max-w-xl text-sm text-pretty text-muted-foreground">{f.description}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {f.utilities.map((u) => (
                      <li key={u}>
                        <Code>{u}</Code>
                      </li>
                    ))}
                  </ul>
                  <p className={cn(f.className, f.specimenClass, "mt-7 text-balance wrap-break-word text-foreground")}>
                    {f.specimen}
                  </p>
                  {f.id === "sans" ? (
                    <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-foreground">
                      <span className="font-normal">Regular 400</span>
                      <span className="font-medium">Medium 500</span>
                      <span className="font-semibold">Semibold 600</span>
                    </p>
                  ) : null}
                  {f.detail ? (
                    <p className={cn(f.className, "mt-3 text-sm whitespace-pre text-muted-foreground")}>{f.detail}</p>
                  ) : null}
                  <p
                    className={cn(
                      f.className,
                      "mt-5 max-w-2xl text-[15px] leading-relaxed wrap-break-word text-muted-foreground",
                    )}
                  >
                    {f.glyphs}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={`${id}-scale`} className="mt-16">
        <SectionHeading id={`${id}-scale`} title="Size scale">
          Twelve steps. The figures are the size and line height each utility produces, in pixels.
        </SectionHeading>
        <ul className="mt-6">
          {sizes.map((s) => (
            <li
              key={s.utility}
              className="grid gap-x-8 gap-y-2 border-t border-border py-4 @2xl:grid-cols-[13rem_minmax(0,1fr)] @2xl:items-baseline"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground @2xl:flex-col">
                <code className="font-mono font-medium text-foreground">{s.utility}</code>
                <Figures m={measured[`size-${s.utility}`]} />
                {s.role ? <span>{s.role}</span> : null}
              </div>
              <p
                data-measure={`size-${s.utility}`}
                className={cn(s.className, "min-w-0 wrap-break-word text-foreground")}
              >
                {s.sample}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${id}-display`} className="mt-16">
        <SectionHeading id={`${id}-display`} title="Display">
          Headlines, section titles and large numerals: weight 600, tight leading, and tracking drawn in as the size
          grows.
        </SectionHeading>
        <ul className="mt-6">
          {displays.map((d, i) => {
            const m = measured[`display-${i}`];
            return (
              <li key={d.className} className="border-t border-border pt-4 pb-10">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 text-[13px] text-muted-foreground">
                  <p className="tabular-nums">
                    {m ? (
                      <>
                        <span className="font-medium text-foreground">{px(m.size)} px</span>
                        <span aria-hidden="true"> · </span>
                        <span className="sr-only">, </span>leading {ratio(m.leading, m.size)}
                        <span aria-hidden="true"> · </span>
                        <span className="sr-only">, </span>tracking {em(m.tracking, m.size)} em
                      </>
                    ) : (
                      " "
                    )}
                  </p>
                  <code className="font-mono text-xs">
                    {d.className.split(" ").map((c, n) => (
                      <Fragment key={c}>
                        {n > 0 ? " " : null}
                        <span className="whitespace-nowrap">{c}</span>
                      </Fragment>
                    ))}
                  </code>
                </div>
                <p
                  data-measure={`display-${i}`}
                  className={cn(d.className, d.width, "mt-5 text-balance wrap-break-word text-foreground")}
                >
                  {d.text}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={`${id}-body`} className="mt-12">
        <SectionHeading id={`${id}-body`} title="Body text">
          Reading text is 16, text inside components is 14. Both are held to a measure of about seventy characters a
          line.
        </SectionHeading>
        <ul className="mt-6">
          {bodies.map((b) => {
            const m = measured[`body-${b.utility}`];
            return (
              <li
                key={b.utility}
                className="grid gap-x-8 gap-y-3 border-t border-border py-6 @2xl:grid-cols-[13rem_minmax(0,1fr)]"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground @2xl:flex-col">
                  <code className="font-mono font-medium text-foreground">{b.utility}</code>
                  <Figures m={m} />
                  <span>{b.role}</span>
                  <code className="font-mono text-xs text-foreground @2xl:mt-2">{b.measure}</code>
                  <span className="tabular-nums">
                    {m?.perLine ? <>About {m.perLine} characters a line</> : "\u00a0"}
                  </span>
                </div>
                <p data-measure={`body-${b.utility}`} className={cn(b.className, "text-pretty text-foreground")}>
                  {b.text}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={`${id}-numerals`} className="mt-12">
        <SectionHeading id={`${id}-numerals`} title="Numerals">
          Figures that change or line up in columns are tabular, so every digit takes the same width. Compare the ones
          and the eights.
        </SectionHeading>
        <div className="mt-6 grid gap-x-12 gap-y-10 @2xl:grid-cols-2">
          <StationTable title="Proportional" utility="proportional-nums" className="proportional-nums" />
          <StationTable title="Tabular" utility="tabular-nums" className="tabular-nums" />
        </div>
      </section>
    </div>
  );
}

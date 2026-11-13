"use client";

import { useId, useRef } from "react";
import { groups, named, pairKey, pairs, shadows } from "./palette";
import { NamedTile, PairTile, SectionHeading, ShadowTile, Swatch, useCopy, useResolved } from "./parts";

export default function ColorDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const resolved = useResolved(ref);
  const { copied, copy, live } = useCopy();
  const id = useId();

  return (
    <div ref={ref} className="@container mx-auto w-full max-w-5xl text-foreground">
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-end @2xl:justify-between @2xl:gap-8">
        <p className="max-w-xl text-[15px] leading-relaxed text-pretty text-muted-foreground">
          Every value here is read from the stylesheet once the page loads, and again when the theme changes, so it
          always matches what you see. Select a swatch to copy its utility.
        </p>
        <p className="min-h-7 shrink-0">
          {resolved?.scheme ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
              {resolved.scheme === "dark" ? "Dark theme values" : "Light theme values"}
            </span>
          ) : null}
        </p>
      </div>

      <section aria-labelledby={`${id}-named`} className="mt-12">
        <SectionHeading id={`${id}-named`} title="Six colours">
          Snow and water carry almost everything. Ink commits, and the three status colours are used sparingly.
        </SectionHeading>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 @2xl:grid-cols-3 @2xl:gap-x-5 @2xl:gap-y-8">
          {named.map((c) => (
            <figure key={c.name} className="min-w-0">
              <NamedTile
                name={c.name}
                fill={c.fill}
                fg={c.fg}
                copied={copied === `named:${c.fill}`}
                onCopy={() => copy(`bg-${c.fill}`, `named:${c.fill}`)}
              />
              <figcaption className="mt-3 text-[13px] leading-relaxed text-pretty text-muted-foreground">
                {c.sentence}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby={`${id}-tokens`} className="mt-20">
        <SectionHeading id={`${id}-tokens`} title="Semantic tokens">
          Components use these names, never raw values. Each one is a CSS variable with a Tailwind utility, and opacity
          modifiers such as <code className="font-mono text-[13px] text-foreground">bg-brand/15</code> work on all of
          them.
        </SectionHeading>
        <div className="mt-10 space-y-12">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`${id}-${group.id}`} className="border-t border-border pt-5">
              <div className="flex flex-col gap-1 @3xl:flex-row @3xl:items-baseline @3xl:gap-8">
                <h3 id={`${id}-${group.id}`} className="w-36 shrink-0 text-[15px] font-semibold text-foreground">
                  {group.title}
                </h3>
                <p className="max-w-xl text-[13px] leading-relaxed text-pretty text-muted-foreground">{group.blurb}</p>
              </div>
              <div className="mt-6 space-y-7">
                {group.rows.map((row, i) => (
                  <div key={row.label ?? i} className="@3xl:flex @3xl:gap-8">
                    {row.label ? (
                      <h4 className="mb-3 w-36 shrink-0 text-[13px] font-medium text-muted-foreground @3xl:mb-0 @3xl:pt-3">
                        {row.label}
                      </h4>
                    ) : (
                      <div aria-hidden="true" className="hidden w-36 shrink-0 @3xl:block" />
                    )}
                    <ul className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-5 @md:grid-cols-2">
                      {row.tokens.map((token) => (
                        <li key={token.name} className="flex min-w-0">
                          <Swatch
                            token={token}
                            value={resolved?.values[token.name]}
                            copied={copied === token.utility}
                            onCopy={() => copy(token.utility)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby={`${id}-pairs`} className="mt-20">
        <SectionHeading id={`${id}-pairs`} title="Pairs and contrast">
          Each fill with the text meant for it. The ratio is computed from the colours as they resolve in this theme;
          body text needs at least 4.5:1.
        </SectionHeading>
        <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-6 @md:grid-cols-2 @3xl:grid-cols-3">
          {pairs.map((pair) => {
            const utilities = `bg-${pair.fill} text-${pair.fg}`;
            return (
              <PairTile
                key={pairKey(pair)}
                pair={pair}
                ratio={resolved?.ratios[pairKey(pair)]}
                copied={copied === utilities}
                onCopy={() => copy(utilities)}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby={`${id}-shadows`} className="mt-20">
        <SectionHeading id={`${id}-shadows`} title="Shadows">
          Six steps, tinted blue. At night each one also draws a thin line of frost along the top edge.
        </SectionHeading>
        <div className="mt-6 rounded-3xl bg-muted px-4 pt-5 pb-12 dark:bg-card @2xl:px-10 @2xl:pt-10 @2xl:pb-16">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 @2xl:grid-cols-3 @2xl:gap-x-10 @2xl:gap-y-14">
            {shadows.map((s) => (
              <li key={s.utility} className="grid">
                <ShadowTile
                  utility={s.utility}
                  use={s.use}
                  copied={copied === s.utility}
                  onCopy={() => copy(s.utility)}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {live}
    </div>
  );
}

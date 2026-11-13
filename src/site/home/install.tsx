"use client";

import Link from "next/link";
import { TypedPhrases } from "@/components/miyuki-ui/typed-phrases";
import { CopyButton } from "@/site/copy-button";

const points = [
  "The code lands in your project, in its own folder beside your other components.",
  "There is no runtime package to keep up with. What you install is plain React and Tailwind.",
  "Change anything. Rename it, restyle it, delete half of it.",
];

export function Install({ slugs, namespace }: { slugs: string[]; namespace: string }) {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto grid max-w-[1240px] items-center gap-x-12 gap-y-10 px-6 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-5">
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-foreground">
            Copy the source. Make it yours.
          </h2>
          <ul className="mt-6 space-y-3 text-base leading-relaxed text-muted-foreground">
            {points.map((point) => (
              <li key={point} className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-brand" />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href="/docs/installation"
            className="mt-7 inline-block rounded-sm text-sm font-medium text-brand-strong underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Read the install guide
          </Link>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <div className="overflow-clip rounded-xl border border-border bg-card shadow-lg">
            <div className="flex h-10 items-center gap-2 border-b border-border px-4">
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="size-2.5 rounded-full border border-border-strong" />
                <span className="size-2.5 rounded-full border border-border-strong" />
                <span className="size-2.5 rounded-full border border-border-strong" />
              </span>
              <span className="mx-auto pr-10 font-mono text-xs text-muted-foreground">your-app</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-5 font-mono text-[13px] leading-relaxed sm:px-5 sm:text-sm">
              <span aria-hidden="true" className="text-brand-strong select-none">
                $
              </span>
              <span className="min-w-0 flex-1 truncate text-foreground">
                <TypedPhrases
                  prefix="npx shadcn@latest add"
                  phrases={slugs.map((slug) => `${namespace}/${slug}`)}
                  typeSpeed={60}
                  deleteSpeed={28}
                  pause={1900}
                />
              </span>
              <CopyButton
                text={`npx shadcn@latest add ${namespace}/${slugs[0] ?? "button"}`}
                label="Copy an install command"
              />
            </div>
            <div className="border-t border-border px-4 py-4 font-mono text-[13px] leading-relaxed text-muted-foreground sm:px-5">
              <p>
                <span className="text-success-strong">+</span> components/miyuki-ui/
                <span className="text-foreground">&lt;component&gt;.tsx</span>
              </p>
              <p>
                <span className="text-success-strong">+</span> a few theme tokens in your stylesheet
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

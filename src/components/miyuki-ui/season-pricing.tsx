"use client";

import { Check } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Odometer } from "@/components/miyuki-ui/odometer";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { cn } from "@/lib/utils";

export interface PricingSeason {
  id: string;
  label: string;
  dates?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description?: ReactNode;
  prices: Record<string, number>;
  per?: ReactNode;
  features: ReactNode[];
  action: string;
  recommended?: boolean | string;
}

export interface SeasonPricingProps extends Omit<ComponentProps<"section">, "title" | "onChange"> {
  plans: PricingPlan[];
  seasons: PricingSeason[];
  title?: ReactNode;
  description?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (season: string) => void;
  onChoose?: (plan: string, season: string) => void;
  currency?: string;
  locale?: string;
  children?: ReactNode;
}

function PlanCard({
  plan,
  season,
  currency,
  locale,
  onChoose,
}: {
  plan: PricingPlan;
  season: string;
  currency: string;
  locale: string;
  onChoose?: (plan: string, season: string) => void;
}) {
  const id = useId();
  const price = plan.prices[season];
  const marked = Boolean(plan.recommended);
  const tag = typeof plan.recommended === "string" ? plan.recommended : "Recommended";

  return (
    <li
      aria-labelledby={id}
      className={cn(
        "relative row-span-4 grid grid-rows-subgrid gap-0 overflow-clip rounded-xl border border-border bg-card px-6 pb-6 text-card-foreground shadow-sm",
        marked ? "border-t-0 pt-[25px]" : "pt-6",
      )}
    >
      {marked ? (
        <>
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-brand" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-brand/[0.07] to-transparent dark:from-brand/[0.09]"
          />
        </>
      ) : null}
      <div className="relative">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id={id} className="text-[15px] font-semibold tracking-[-0.01em]">
            {plan.name}
          </h3>
          {marked ? <span className="shrink-0 text-xs font-medium text-brand-strong">{tag}</span> : null}
        </div>
        {plan.description ? (
          <p className="mt-1.5 text-sm/6 text-pretty text-muted-foreground">{plan.description}</p>
        ) : null}
      </div>
      <div className="relative pt-6">
        <p className="text-[2.25rem] leading-none tracking-[-0.02em] @2xl:text-[clamp(1.375rem,4cqi,2.375rem)]">
          {price == null ? (
            <span className="font-display font-semibold text-muted-foreground">—</span>
          ) : (
            <Odometer
              value={price}
              locale={locale}
              format={{ style: "currency", currency, maximumFractionDigits: 0 }}
              duration={900}
              className="[--miyuki-odometer-shade:transparent]"
            />
          )}
        </p>
        {plan.per ? <p className="mt-2 text-[13px] text-muted-foreground">{plan.per}</p> : null}
      </div>
      <ul className="relative mt-6 flex flex-col gap-2.5 border-t border-border pt-5 text-sm/5">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex gap-2.5">
            <Check aria-hidden="true" className="mt-px size-4 shrink-0 text-brand-strong" strokeWidth={2} />
            <span className="text-pretty">{feature}</span>
          </li>
        ))}
      </ul>
      <div className="relative flex items-end pt-7">
        <Button variant={marked ? "brand" : "secondary"} className="w-full" onPress={() => onChoose?.(plan.id, season)}>
          {plan.action}
        </Button>
      </div>
    </li>
  );
}

export function SeasonPricing({
  plans,
  seasons,
  title,
  description,
  value,
  defaultValue,
  onValueChange,
  onChoose,
  currency = "JPY",
  locale = "en-US",
  className,
  children,
  ...props
}: SeasonPricingProps) {
  const [own, setOwn] = useState(defaultValue ?? seasons[0]?.id ?? "");
  const season = value ?? own;
  const headingId = useId();

  const current = seasons.find((s) => s.id === season);

  return (
    <section {...props} aria-labelledby={title ? headingId : undefined} className={cn("@container w-full", className)}>
      <div className="flex flex-col gap-6 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        {title || description ? (
          <div className="max-w-md">
            {title ? (
              <h2
                id={headingId}
                className="font-display text-3xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance"
              >
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-3 text-base/7 text-pretty text-muted-foreground">{description}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 @2xl:items-end">
          <SegmentedControl
            aria-label="Season"
            selectedKeys={[season]}
            onSelectionChange={(keys) => {
              const next = String([...keys][0] ?? season);
              if (value === undefined) setOwn(next);
              onValueChange?.(next);
            }}
            className="self-start @2xl:self-end"
          >
            {seasons.map((s) => (
              <Segment key={s.id} id={s.id}>
                {s.label}
              </Segment>
            ))}
          </SegmentedControl>
          <p aria-live="polite" className="text-[13px] text-muted-foreground tabular-nums">
            {current ? (
              <>
                <span className="sr-only">{current.label} prices, </span>
                {current.dates ?? current.label}
              </>
            ) : null}
          </p>
        </div>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-4 @2xl:grid-cols-3 @2xl:gap-5">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} season={season} currency={currency} locale={locale} onChoose={onChoose} />
        ))}
      </ul>
      {children ? <div className="mt-6 max-w-2xl text-xs/5 text-pretty text-muted-foreground">{children}</div> : null}
    </section>
  );
}

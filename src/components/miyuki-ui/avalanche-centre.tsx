"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Download, FileText } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, startTransition, useState } from "react";
import {
  AvalancheBulletin,
  type AvalancheBulletinData,
  type AvalancheProblemKind,
  type DangerLevel,
} from "@/components/miyuki-ui/avalanche-bulletin";
import { Button } from "@/components/miyuki-ui/button";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/miyuki-ui/data-table";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { cn } from "@/lib/utils";

export interface AvalancheCentreProps extends Omit<ComponentProps<"div">, "children"> {
  avatars?: Record<string, string>;
  map?: string;
  defaultRegion?: RegionId;
}

type RegionId = "hakuba" | "otari" | "nozawa" | "kiso";

const NAMES = ["", "Low", "Moderate", "Considerable", "High", "Very high"];
const FILL = [
  "transparent",
  "var(--miyuki-avalanche-centre-l1)",
  "var(--miyuki-avalanche-centre-l2)",
  "color-mix(in oklab, var(--warning) 40%, var(--destructive))",
  "var(--destructive)",
  "color-mix(in oklab, var(--destructive) 62%, oklch(0.2 0.06 18))",
];
const INK = [
  "",
  "text-foreground",
  "text-foreground dark:text-background",
  "text-foreground dark:text-background",
  "text-destructive-foreground",
  "text-background dark:text-foreground",
];
const SVG_INK = [
  "",
  "fill-foreground",
  "fill-foreground dark:fill-background",
  "fill-foreground dark:fill-background",
  "fill-destructive-foreground",
  "fill-background dark:fill-foreground",
];
const PROBLEM: Record<AvalancheProblemKind, string> = {
  "wind-slab": "Wind slab",
  "persistent-weak-layer": "Persistent weak layer",
  "wet-snow": "Wet snow",
  "new-snow": "New snow",
  "gliding-snow": "Gliding snow",
};

const WEEK = [
  { day: "Sun", date: 7 },
  { day: "Mon", date: 8 },
  { day: "Tue", date: 9 },
  { day: "Wed", date: 10 },
  { day: "Thu", date: 11 },
  { day: "Fri", date: 12 },
  { day: "Sat", date: 13 },
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ALL = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

interface Region {
  id: RegionId;
  name: string;
  forecaster: string;
  office: string;
  history: DangerLevel[];
  earlier: DangerLevel[];
  trend: string;
  problems: AvalancheProblemKind[];
  colleague: string;
  zone: string;
  label: [number, number];
  bulletin: (avatar?: string) => AvalancheBulletinData;
}

const REGIONS: Region[] = [
  {
    id: "hakuba",
    name: "Hakuba",
    forecaster: "Yuna Sato",
    office: "Hakuba office",
    history: [2, 2, 2, 2, 3, 4, 3],
    earlier: [2, 2, 3, 3, 2, 2],
    trend: "Up from 2 on Thursday as the storm arrived, high on Friday, easing to considerable today.",
    problems: ["wind-slab", "persistent-weak-layer", "persistent-weak-layer", "new-snow", "new-snow", "wind-slab"],
    colleague: "Riku Tanabe",
    zone: "M78 116L102 130L140 146L176 134L214 124L238 160L244 198L226 236L190 252L150 262L112 246L86 214L68 172Z",
    label: [156, 192],
    bulletin: (avatar) => ({
      region: "Hakuba",
      areas: "Shirouma, Happo ridge, Goryu and Kashimayari",
      issued: "Fri 12 Feb 2027, 17:00",
      validUntil: "Sat 13 Feb, 17:00",
      level: 3,
      bands: ["Below 1,600 m", "1,600 to 2,200 m", "Above 2,200 m"],
      levels: [
        [2, 3, 3],
        [2, 3, 3],
        [1, 2, 3],
        [1, 2, 2],
        [1, 2, 2],
        [1, 2, 2],
        [1, 2, 3],
        [2, 3, 3],
      ],
      headline: "New wind slabs on north and east slopes near the ridges are the main danger today.",
      tendency: "Sunday: rising to 4 above the tree line as heavy snow returns",
      problems: [
        {
          kind: "wind-slab",
          aspects: ["W", "NW", "N", "NE", "E"],
          bands: [1, 2],
          elevation: "Above 1,600 m, worst below ridgelines",
          time: "All day",
          description:
            "Thursday’s storm and a strong north-west wind built slabs 20 to 40 cm thick in bowls and gullies. A single skier can release them on slopes over 30°.",
        },
        {
          kind: "persistent-weak-layer",
          aspects: ["NW", "N", "NE"],
          bands: [2],
          elevation: "Above 2,200 m",
          time: "All day",
          description:
            "Surface hoar buried on 2 February lies 70 to 100 cm down on shaded slopes. Hard to trigger, but slides on it run far. Keep off thin, rocky ground.",
        },
        {
          kind: "new-snow",
          aspects: [...ALL],
          bands: [1, 2],
          elevation: "Above 1,600 m",
          time: "From 15:00",
          hours: [15, 24],
          description:
            "Snow returns this afternoon and turns heavy after dark. Expect loose slides from steep ground by evening, growing overnight.",
        },
      ],
      forecaster: {
        name: "Yuna Sato",
        role: "Forecaster, Hakuba office",
        avatar,
        text: (
          <>
            <p>
              Thursday and Friday brought 40 cm to the ridges on a strong north-west wind, and the wind did most of the
              work. On the north and east sides above the tree line, what looks like good powder is often a slab resting
              on something weak. Patrol released two slabs with charges on the Happo ridge this morning, both 30 cm
              deep.
            </p>
            <p>
              Choose slopes under 30° on shaded aspects, keep to ridges rather than gullies, and be off the hill before
              the snow starts again this afternoon. The next bulletin comes out at 17:00.
            </p>
          </>
        ),
      },
    }),
  },
  {
    id: "otari",
    name: "Otari",
    forecaster: "Kenta Hoshino",
    office: "Otari office",
    history: [2, 2, 3, 3, 3, 4, 4],
    earlier: [2, 3, 3, 3, 2, 2],
    trend: "Rising all week. High since Friday, with 62 cm of new snow at the Norikura station.",
    problems: ["wind-slab", "persistent-weak-layer", "wind-slab", "new-snow", "new-snow", "new-snow"],
    colleague: "Nanami Ueda",
    zone: "M62 52L104 30L150 34L192 22L226 52L232 92L214 124L176 134L140 146L102 130L78 116L58 86Z",
    label: [146, 78],
    bulletin: (avatar) => ({
      region: "Otari",
      areas: "Norikura, Amakazari and the Hiraiwa valley",
      issued: "Fri 12 Feb 2027, 17:00",
      validUntil: "Sat 13 Feb, 17:00",
      level: 4,
      bands: ["Below 1,400 m", "1,400 to 2,000 m", "Above 2,000 m"],
      levels: [
        [2, 3, 4],
        [2, 3, 4],
        [2, 3, 4],
        [2, 3, 3],
        [2, 2, 3],
        [2, 2, 3],
        [2, 3, 3],
        [2, 3, 4],
      ],
      headline: "Natural avalanches are likely on steep slopes above 1,400 m. Stay off them and out from under them.",
      tendency: "Sunday: staying at 4 with more heavy snow",
      problems: [
        {
          kind: "new-snow",
          aspects: [...ALL],
          bands: [1, 2],
          elevation: "Above 1,400 m",
          time: "All day",
          description:
            "62 cm fell at the Norikura station in 36 hours. It has not bonded to the old surface and is releasing on its own from steep, sheltered slopes.",
        },
        {
          kind: "wind-slab",
          aspects: ["NW", "N", "NE", "E", "SE"],
          bands: [1, 2],
          elevation: "Above 1,600 m",
          time: "All day",
          description:
            "Deep slabs sit on lee slopes below every ridge. Some are large enough to bury a car and reach the valley floor.",
        },
        {
          kind: "gliding-snow",
          aspects: ["SE", "S", "SW"],
          bands: [0, 1],
          elevation: "Below 1,800 m",
          time: "Any time",
          description:
            "Glide cracks are open on grassy south slopes above the road. Glide avalanches come without warning; do not stop below them.",
        },
      ],
      forecaster: {
        name: "Kenta Hoshino",
        role: "Forecaster, Otari office",
        avatar,
        text: (
          <>
            <p>
              The Otari side caught the heaviest of the storm. We saw six natural avalanches from the Hiraiwa road
              yesterday, two of them large, all from slopes steeper than 35° above 1,600 m.
            </p>
            <p>
              This is not a day for steep terrain at any height. Gentle forest below 1,400 m is the only sensible
              choice.
            </p>
          </>
        ),
      },
    }),
  },
  {
    id: "nozawa",
    name: "Nozawa",
    forecaster: "Mio Arai",
    office: "Iiyama office",
    history: [1, 1, 2, 2, 2, 3, 2],
    earlier: [1, 1, 2, 2, 2, 1],
    trend: "Moderate most of the week, considerable for one day after Friday’s snow.",
    problems: ["gliding-snow", "wind-slab", "wind-slab", "new-snow", "new-snow", "wind-slab"],
    colleague: "Sota Hirano",
    zone: "M226 52L268 40L314 34L352 58L372 104L362 150L340 188L300 206L262 196L244 198L238 160L214 124L232 92Z",
    label: [298, 122],
    bulletin: (avatar) => ({
      region: "Nozawa",
      areas: "Kenashi, the Nozawa bowls and Mount Madarao",
      issued: "Fri 12 Feb 2027, 17:00",
      validUntil: "Sat 13 Feb, 17:00",
      level: 2,
      bands: ["Below 1,000 m", "1,000 to 1,400 m", "Above 1,400 m"],
      levels: [
        [1, 2, 2],
        [1, 2, 2],
        [1, 2, 2],
        [1, 1, 2],
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 2],
        [1, 2, 2],
      ],
      headline: "Watch for small wind slabs on north-east slopes near the tops. Most slopes are stable.",
      tendency: "Sunday: rising to 3 with the new snow",
      problems: [
        {
          kind: "wind-slab",
          aspects: ["N", "NE", "E"],
          bands: [1, 2],
          elevation: "Above 1,000 m",
          time: "All day",
          description:
            "Thin slabs, 10 to 20 cm, lie just below the Kenashi ridge. They are easy to spot and easy to step around.",
        },
        {
          kind: "new-snow",
          aspects: [...ALL],
          bands: [2],
          elevation: "Above 1,400 m",
          time: "From 18:00",
          hours: [18, 24],
          description:
            "Snow starts this evening. Tomorrow’s bulletin will likely raise the level as it piles up overnight.",
        },
        {
          kind: "gliding-snow",
          aspects: ["S", "SW"],
          bands: [0],
          elevation: "Below 1,000 m",
          time: "12:00 to 17:00",
          hours: [12, 17],
          description: "A few glide cracks on the grassy slopes above the village. Do not linger below them.",
        },
      ],
      forecaster: {
        name: "Mio Arai",
        role: "Forecaster, Iiyama office",
        avatar,
        text: (
          <>
            <p>
              Friday’s 25 cm has settled well below the tree line. The only concern today is the small slabs under the
              Kenashi ridge and the glide cracks above the village.
            </p>
            <p>A good day for the bowls if you watch the tops. Expect a higher level tomorrow.</p>
          </>
        ),
      },
    }),
  },
  {
    id: "kiso",
    name: "Kiso",
    forecaster: "Daichi Kudo",
    office: "Kiso office",
    history: [1, 1, 1, 2, 2, 2, 2],
    earlier: [1, 1, 1, 2, 1, 1],
    trend: "Moderate since Wednesday. The storm passed mostly to the north.",
    problems: ["wet-snow", "wet-snow", "wind-slab", "wind-slab", "wind-slab", "wind-slab"],
    colleague: "Emi Kato",
    zone: "M112 246L150 262L190 252L226 236L244 198L262 196L300 206L312 252L298 306L270 352L226 392L180 398L140 372L116 330L104 286Z",
    label: [206, 318],
    bulletin: (avatar) => ({
      region: "Kiso",
      areas: "Ontake, Kiso-Komagatake and the Kiso valley",
      issued: "Fri 12 Feb 2027, 17:00",
      validUntil: "Sat 13 Feb, 17:00",
      level: 2,
      bands: ["Below 1,800 m", "1,800 to 2,400 m", "Above 2,400 m"],
      levels: [
        [1, 2, 2],
        [1, 2, 2],
        [1, 1, 2],
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 2],
        [1, 2, 2],
        [1, 2, 2],
      ],
      headline: "Older wind slabs linger on north-facing slopes high up. Elsewhere the snow is settling well.",
      tendency: "Sunday: steady at 2",
      problems: [
        {
          kind: "wind-slab",
          aspects: ["W", "NW", "N", "NE"],
          bands: [1, 2],
          elevation: "Above 1,800 m",
          time: "All day",
          description:
            "Slabs from Tuesday’s wind are bonding slowly. Test small slopes before you commit to bigger ones.",
        },
        {
          kind: "persistent-weak-layer",
          aspects: ["N", "NE"],
          bands: [2],
          elevation: "Above 2,400 m",
          time: "All day",
          description:
            "Facets near the ground on Ontake’s north side. Unlikely to trigger, but a slide would take the whole season’s snow.",
        },
        {
          kind: "wet-snow",
          aspects: ["E", "SE", "S", "SW"],
          bands: [0],
          elevation: "Below 1,800 m",
          time: "11:00 to 15:00",
          hours: [11, 15],
          description:
            "Sun on the lower slopes will loosen the surface by late morning. Expect small wet slides from rocks.",
        },
      ],
      forecaster: {
        name: "Daichi Kudo",
        role: "Forecaster, Kiso office",
        avatar,
        text: (
          <>
            <p>The storm stayed north of us. Kiso has had a quiet week with only 8 cm on Friday and plenty of sun.</p>
            <p>Watch the north side of Ontake above 2,400 m, and the sun-warmed slopes after eleven.</p>
          </>
        ),
      },
    }),
  },
];

interface ArchiveRow {
  id: string;
  date: string;
  sort: number;
  level: DangerLevel;
  levelName: string;
  change: number;
  problem: string;
  forecaster: string;
}

function archiveFor(region: Region): ArchiveRow[] {
  const levels = [...region.earlier, ...region.history];
  const rng = createRng(`archive-${region.id}`);
  const rows = levels.map((level, i) => {
    const date = i + 1;
    const day = DAY_NAMES[date % 7];
    const problem =
      i >= levels.length - 6
        ? region.problems[i - (levels.length - 6)]
        : rng.pick(Object.keys(PROBLEM) as AvalancheProblemKind[]);
    const kind = i === levels.length - 1 ? region.bulletin().problems[0].kind : problem;
    return {
      id: `${region.id}-${date}`,
      date: `${day} ${date} Feb`,
      sort: date,
      level,
      levelName: NAMES[level],
      change: i === 0 ? 0 : level - levels[i - 1],
      problem: PROBLEM[kind],
      forecaster: i % 3 === 1 && i < levels.length - 1 ? region.colleague : region.forecaster,
    };
  });
  return rows.reverse();
}

function LevelChip({ level, size = "md", className }: { level: DangerLevel; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center font-semibold tabular-nums ring-1 ring-foreground/10 ring-inset",
        size === "sm" ? "size-5 rounded-[5px] text-xs" : "size-6 rounded-md text-[13px]",
        INK[level],
        className,
      )}
      style={{ background: FILL[level] }}
    >
      <span aria-hidden="true">{level}</span>
      <span className="sr-only">
        level {level}, {NAMES[level].toLowerCase()}
      </span>
    </span>
  );
}

function RegionMap({
  selected,
  onSelect,
  texture,
}: {
  selected: RegionId;
  onSelect: (id: RegionId) => void;
  texture?: string;
}) {
  const [focused, setFocused] = useState<RegionId | null>(null);
  const onKey = (event: KeyboardEvent<SVGGElement>, id: RegionId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };
  const order = [...REGIONS].sort((a, b) => Number(a.id === selected) - Number(b.id === selected));
  return (
    <div className="relative overflow-clip rounded-lg bg-muted">
      {texture && (
        <img src={texture} alt="" className="absolute inset-0 size-full object-cover opacity-40 dark:opacity-25" />
      )}
      <svg viewBox="40 10 350 400" className="relative block h-auto w-full">
        {order.map((r) => {
          const level = r.bulletin().level;
          const on = r.id === selected;
          return (
            <g
              key={r.id}
              role="button"
              tabIndex={0}
              aria-label={`${r.name}, level ${level}, ${NAMES[level].toLowerCase()}${on ? ", shown" : ""}`}
              aria-pressed={on}
              onClick={() => onSelect(r.id)}
              onKeyDown={(e) => onKey(e, r.id)}
              onFocus={(e) => e.currentTarget.matches(":focus-visible") && setFocused(r.id)}
              onBlur={() => setFocused(null)}
              className="cursor-pointer outline-none"
            >
              <path
                d={r.zone}
                strokeWidth={3}
                strokeLinejoin="round"
                style={{ fill: FILL[level], stroke: "var(--card)" }}
              />
              {(on || focused === r.id) && (
                <path
                  d={r.zone}
                  fill="none"
                  strokeLinejoin="round"
                  strokeWidth={on ? 2.5 : 4}
                  className={on ? "stroke-foreground" : "stroke-ring"}
                />
              )}
              <text
                x={r.label[0]}
                y={r.label[1] - 4}
                textAnchor="middle"
                className={SVG_INK[level]}
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {r.name}
              </text>
              <text
                x={r.label[0]}
                y={r.label[1] + 13}
                textAnchor="middle"
                className={SVG_INK[level]}
                style={{ fontSize: 11.5 }}
              >
                {level} · {NAMES[level]}
              </text>
            </g>
          );
        })}
        <g transform="translate(362 372)" className="fill-foreground/70">
          <path d="M0 -14L5 0H-5Z" />
          <text y={12} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600 }}>
            N
          </text>
        </g>
      </svg>
    </div>
  );
}

export function AvalancheCentre({
  avatars = {},
  map,
  defaultRegion = "hakuba",
  className,
  ...props
}: AvalancheCentreProps) {
  const [region, setRegion] = useState<RegionId>(defaultRegion);
  const choose = (id: RegionId) => startTransition(() => setRegion(id));
  const current = REGIONS.find((r) => r.id === region) ?? REGIONS[0];
  const rows = archiveFor(current);

  const columns: DataTableColumn<ArchiveRow>[] = [
    {
      id: "date",
      header: "Date",
      isRowHeader: true,
      sortable: true,
      value: (r) => r.sort,
      cell: (r) => <span className="whitespace-nowrap tabular-nums">{r.date}</span>,
    },
    {
      id: "level",
      header: "Danger",
      sortable: true,
      value: (r) => r.level,
      cell: (r) => (
        <span className="flex items-center gap-2">
          <LevelChip level={r.level} size="sm" />
          <span>{r.levelName}</span>
        </span>
      ),
    },
    {
      id: "change",
      header: "Change",
      value: (r) => r.change,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {r.change > 0 ? (
            <ArrowUpRight aria-hidden="true" className="size-4 text-destructive-strong" />
          ) : r.change < 0 ? (
            <ArrowDownRight aria-hidden="true" className="size-4 text-success-strong" />
          ) : (
            <ArrowRight aria-hidden="true" className="size-4" />
          )}
          {r.change > 0 ? "Up" : r.change < 0 ? "Down" : "Steady"}
        </span>
      ),
    },
    { id: "problem", header: "Main problem", value: (r) => r.problem },
    { id: "forecaster", header: "Forecaster", value: (r) => r.forecaster },
  ];

  const filters: DataTableFilter<ArchiveRow>[] = [
    {
      id: "level",
      label: "Level",
      allLabel: "Any level",
      value: (r) => String(r.level),
      options: [1, 2, 3, 4, 5].map((l) => ({ id: String(l), label: `${l}, ${NAMES[l]}` })),
    },
  ];

  return (
    <div
      {...props}
      className={cn(
        "min-h-dvh bg-background text-foreground",
        "[--miyuki-avalanche-centre-l1:color-mix(in_oklab,var(--warning)_28%,var(--card))] [--miyuki-avalanche-centre-l2:color-mix(in_oklab,var(--warning)_74%,var(--card))]",
        "dark:[--miyuki-avalanche-centre-l1:color-mix(in_oklab,var(--warning)_30%,oklch(0.25_0.025_70))] dark:[--miyuki-avalanche-centre-l2:color-mix(in_oklab,var(--warning)_80%,oklch(0.25_0.025_70))]",
        className,
      )}
    >
      <Tabs selectedKey={region} onSelectionChange={(key) => choose(key as RegionId)} className="gap-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 sm:px-6 lg:flex-nowrap lg:gap-x-8 lg:px-8 lg:pt-0">
            <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none lg:py-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                >
                  <path d="M3 19 10 7l4 6 2-3 5 9Z" />
                  <path d="M3 19h18" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] leading-5 font-semibold tracking-[-0.01em] text-foreground">
                  Northern Alps avalanche centre
                </h1>
                <p className="truncate text-xs leading-4 text-muted-foreground">Bulletins every day at 17:00</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              iconStart={<Bell aria-hidden="true" />}
              className="ms-auto shrink-0 max-sm:px-2.5 lg:order-last lg:ms-0"
            >
              <span className="max-sm:sr-only">Subscribe</span>
            </Button>
            <TabList aria-label="Regions" className="order-last w-full bg-none lg:order-none lg:ms-auto lg:w-auto">
              {REGIONS.map((r) => {
                const level = r.bulletin().level;
                return (
                  <Tab key={r.id} id={r.id} className="h-12">
                    {r.name}
                    <LevelChip level={level} size="sm" />
                  </Tab>
                );
              })}
            </TabList>
          </div>
        </header>

        {REGIONS.map((r) => {
          const bulletin = r.bulletin(avatars[r.forecaster]);
          return (
            <TabPanel key={r.id} id={r.id} className="rounded-none data-[focus-visible]:ring-inset">
              <main className="@container/main mx-auto w-full max-w-[1280px] px-4 pt-8 pb-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-x-10 gap-y-10 @min-[1060px]/main:grid-cols-12">
                  <AvalancheBulletin bulletin={bulletin} className="min-w-0 @min-[1060px]/main:col-span-8" />
                  <aside className="flex min-w-0 flex-col gap-6 @min-[640px]/main:grid @min-[640px]/main:grid-cols-2 @min-[640px]/main:items-start @min-[1060px]/main:sticky @min-[1060px]/main:top-24 @min-[1060px]/main:col-span-4 @min-[1060px]/main:flex @min-[1060px]/main:self-start">
                    <section
                      aria-labelledby={`miyuki-avalanche-centre-map-${r.id}`}
                      className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                        <h2
                          id={`miyuki-avalanche-centre-map-${r.id}`}
                          className="text-sm font-semibold text-foreground"
                        >
                          Regions today
                        </h2>
                        <p className="text-xs text-muted-foreground">Select a region to read it</p>
                      </div>
                      <RegionMap selected={r.id} onSelect={choose} texture={map} />
                      <ul className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 px-1" aria-label="Danger scale">
                        {([1, 2, 3, 4, 5] as const).map((l) => (
                          <li key={l} className="flex items-center gap-1.5 text-xs text-foreground">
                            <LevelChip level={l} size="sm" />
                            <span aria-hidden="true">{NAMES[l]}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section
                      aria-labelledby={`miyuki-avalanche-centre-week-${r.id}`}
                      className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h2
                          id={`miyuki-avalanche-centre-week-${r.id}`}
                          className="text-sm font-semibold text-foreground"
                        >
                          Last seven days
                        </h2>
                        <p className="text-xs text-muted-foreground tabular-nums">7 to 13 February</p>
                      </div>
                      <ol className="mt-4 grid grid-cols-7 gap-1">
                        {WEEK.map((d, i) => {
                          const level = r.history[i];
                          const today = i === WEEK.length - 1;
                          return (
                            <li key={d.date} className="flex min-w-0 flex-col items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-xs leading-4",
                                  today ? "font-semibold text-foreground" : "text-muted-foreground",
                                )}
                              >
                                {today ? "Today" : d.day}
                              </span>
                              <span
                                className={cn(
                                  "grid h-12 w-full place-items-center rounded-md font-display text-xl font-semibold tabular-nums ring-1 ring-foreground/10 ring-inset",
                                  INK[level],
                                  today && "ring-2 ring-foreground",
                                )}
                                style={{ background: FILL[level] }}
                              >
                                <span aria-hidden="true">{level}</span>
                                <span className="sr-only">
                                  {d.day} {d.date} February: level {level}, {NAMES[level].toLowerCase()}
                                </span>
                              </span>
                              <span aria-hidden="true" className="text-xs leading-4 text-muted-foreground tabular-nums">
                                {d.date}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                      <p className="mt-4 text-[13px] leading-5 text-pretty text-muted-foreground">{r.trend}</p>
                    </section>
                  </aside>
                </div>
              </main>
            </TabPanel>
          );
        })}
      </Tabs>

      <section
        aria-labelledby="miyuki-avalanche-centre-archive"
        className="mx-auto w-full max-w-[1280px] px-4 pb-14 sm:px-6 lg:px-8"
      >
        <div className="border-t border-border pt-10">
          <h2
            id="miyuki-avalanche-centre-archive"
            className="mb-1 font-display text-2xl leading-8 font-semibold tracking-[-0.02em] text-foreground"
          >
            Past bulletins, {current.name}
          </h2>
          <DataTable
            aria-label={`Past bulletins for ${current.name}`}
            columns={columns}
            rows={rows}
            searchKeys={["date", "levelName", "problem", "forecaster"]}
            searchPlaceholder="Search by date, problem or forecaster"
            filters={filters}
            pageSize={7}
            pageSizes={[7, 14]}
            noun={["bulletin", "bulletins"]}
            rowActions={[
              { id: "open", label: "Read bulletin", icon: <FileText /> },
              { id: "pdf", label: "Download PDF", icon: <Download /> },
            ]}
            bulkActions={[{ id: "pdf", label: "Download PDFs", icon: <Download /> }]}
            description={`From 1 to 13 February 2027, newest first. Each bulletin is valid from 17:00 until 17:00 the next day.`}
          />
        </div>
      </section>
    </div>
  );
}

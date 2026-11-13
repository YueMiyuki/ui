"use client";

import { ChevronLeft } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type MouseEvent, type ReactNode, useId, useState } from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { BrushAnnotation } from "@/components/miyuki-ui/brush-annotation";
import { FieldNotes, Figure, Note } from "@/components/miyuki-ui/field-notes";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { StationNav } from "@/components/miyuki-ui/station-nav";
import { ZoomGrid } from "@/components/miyuki-ui/zoom-grid";
import { cn } from "@/lib/utils";

export type FieldJournalImage =
  | "kiso-road"
  | "otaru-glass"
  | "tea-altitude"
  | "snow-plough"
  | "fukushima-river"
  | "tsumago-morning"
  | "archive-shirakawa"
  | "archive-nozawa"
  | "archive-aomori"
  | "archive-yakushima";

export type FieldJournalView = "front" | "article";

export interface FieldJournalProps extends Omit<ComponentProps<"div">, "children"> {
  images?: Partial<Record<FieldJournalImage, string>>;
  avatars?: Record<string, string>;
  defaultView?: FieldJournalView;
}

interface Story {
  id: string;
  kicker: string;
  title: string;
  standfirst: string;
  author: string;
  role: string;
  minutes: number;
  image?: FieldJournalImage;
  alt: string;
  caption?: string;
}

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;

const LEAD: Story = {
  id: "kiso-road",
  kicker: "Field notes · Kiso valley",
  title: "Four days on the Kiso road, one post town at a time",
  standfirst:
    "In February the old Nakasendō is empty of tour groups and half buried in snow. Aiko Tanaka walked it south from Narai to Magome, sleeping in inns that keep the hearth lit for whoever turns up.",
  author: "Aiko Tanaka",
  role: "Mountain guide",
  minutes: 14,
  image: "kiso-road",
  alt: "A snowy valley under low cloud, with a ridge of cedar in the foreground",
  caption: "Above Narai at first light, on the climb to Torii Pass.",
};

const GLASS: Story = {
  id: "otaru-glass",
  kicker: "Craft · Otaru",
  title: "The furnace that has not gone out since 1987",
  standfirst: "When the canal freezes, the warmest room in Otaru is an old herring warehouse where the glass is blown.",
  author: "Mateo Álvarez",
  role: "Photographer",
  minutes: 6,
  image: "otaru-glass",
  alt: "Warehouses along a canal at dusk, with lamps lit",
  caption: "The canal at a quarter past four, when the gas lamps come on.",
};

const COLD: Story = {
  id: "coldest-morning",
  kicker: "Weather · Niseko",
  title: "The coldest morning in eleven years, and how we saw it coming",
  standfirst: "Clear sky, no wind and new snow: a forecaster on the three signs that turn a cold night into a record.",
  author: "Yuna Sato",
  role: "Weather forecaster",
  minutes: 5,
  alt: "",
};

const TEA: Story = {
  id: "tea-altitude",
  kicker: "Kitchen · Northern Alps",
  title: "Making tea when the water boils at 93 °C",
  standfirst: "At two thousand metres the kettle gives up early. A tea buyer on brewing in a mountain hut.",
  author: "Priya Raman",
  role: "Tea buyer",
  minutes: 4,
  image: "tea-altitude",
  alt: "A mountain ridge in clear daylight",
  caption: "The ridge above the hut, two hours after breakfast.",
};

const PLOUGH: Story = {
  id: "snow-plough",
  kicker: "Rail · Otaru",
  title: "Five hours on the snowplough before the first train",
  standfirst: "The first train out of Otaru each winter morning carries no passengers. Chen Wei rode in the cab.",
  author: "Chen Wei",
  role: "Rail operations engineer",
  minutes: 7,
  image: "snow-plough",
  alt: "Hills under deep snow at night",
  caption: "The cuttings past Ranshima at 04:30, photographed from the cab.",
};

const STORIES = [LEAD, GLASS, COLD, TEA, PLOUGH];

const SECTIONS = [
  { key: "narai", label: "Narai-juku", detail: "Day 1 · km 0" },
  { key: "torii", label: "Torii Pass", detail: "Day 1 · km 3" },
  { key: "yabuhara", label: "Yabuhara", detail: "Day 1 · km 6" },
  { key: "fukushima", label: "Kiso-Fukushima", detail: "Day 2 · km 21" },
  { key: "tsumago", label: "Tsumago", detail: "Day 3 · km 67" },
  { key: "magome", label: "Magome", detail: "Day 4 · km 75" },
];

const ARCHIVE: {
  id: string;
  image: FieldJournalImage;
  issue: string;
  title: string;
  text: string;
  alt: string;
  className?: string;
}[] = [
  {
    id: "shirakawa",
    image: "archive-shirakawa",
    issue: "No. 27 · Winter 2026",
    title: "Shirakawa under four metres of snow",
    text: "The village lights its farmhouses on a few evenings each winter. We went on the one night it snowed, and stood in the field below the lookout until our boots froze to the path.",
    alt: "Steep-roofed farmhouses in a valley at night",
    className: "@2xl:row-span-2",
  },
  {
    id: "nozawa",
    image: "archive-nozawa",
    issue: "No. 23 · Winter 2025",
    title: "The fire festival at Nozawa",
    text: "Every January the men of Nozawa build a shrine of beech wood and defend it against the whole village's torches. Mateo Álvarez photographed it from the inside.",
    alt: "A snowy village on a hillside",
    className: "@2xl:col-span-2",
  },
  {
    id: "aomori",
    image: "archive-aomori",
    issue: "No. 19 · Winter 2024",
    title: "Aomori, eight metres a winter",
    text: "A month with the crews who move the snow off the city's streets, one road at a time, from midnight until six.",
    alt: "A harbour city at dawn",
  },
  {
    id: "yakushima",
    image: "archive-yakushima",
    issue: "No. 15 · Winter 2023",
    title: "Yakushima, snow above the cedar",
    text: "Subtropical on the shore, white on the peaks: four days climbing through every season on one island.",
    alt: "Forested peaks at dusk",
  },
];

const dropCap =
  "first-letter:float-left first-letter:mt-[0.12em] first-letter:mr-2.5 first-letter:font-display first-letter:text-[3.55em] first-letter:leading-[0.78] first-letter:font-semibold first-letter:text-foreground";

function Picture({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} draggable={false} className={cn("block w-full bg-muted object-cover", className)} />
  ) : (
    <div role={alt ? "img" : undefined} aria-label={alt || undefined} className={cn("w-full bg-muted", className)} />
  );
}

function Byline({ story, avatar, size = "sm" }: { story: Story; avatar?: string; size?: "sm" | "md" }) {
  return (
    <p className={cn("flex items-center gap-2.5 text-muted-foreground", size === "md" ? "text-sm" : "text-[13px]")}>
      <Avatar src={avatar} name={story.author} size={size === "md" ? "md" : "sm"} />
      <span>
        <span className="font-medium text-foreground">{story.author}</span>
        <span aria-hidden="true"> · </span>
        <span className="tabular-nums">{story.minutes} min read</span>
      </span>
    </p>
  );
}

function StoryLink({
  story,
  onOpen,
  className,
  children,
}: {
  story: Story;
  onOpen: (id: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`#${story.id}`}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onOpen(story.id);
      }}
      className={cn(
        "rounded-sm decoration-foreground/30 decoration-1 underline-offset-[0.18em] outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </a>
  );
}

export function FieldJournal({
  images = {},
  avatars = {},
  defaultView = "front",
  className,
  ...props
}: FieldJournalProps) {
  const reduce = useReducedMotion() ?? false;
  const [storyId, setStoryId] = useState<string | null>(defaultView === "article" ? LEAD.id : null);
  const story = STORIES.find((s) => s.id === storyId) ?? null;

  const go = (id: string | null) => {
    setStoryId(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <div {...props} className={cn("min-h-dvh bg-background text-foreground", className)}>
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <header className="pt-4 sm:pt-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] text-muted-foreground tabular-nums">
              <span className="hidden sm:inline">Saturday </span>13 February 2027
            </p>
            <SegmentedControl
              size="sm"
              aria-label="View"
              selectedKeys={[story ? "article" : "front"]}
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (next === "front") go(null);
                else if (!story) go(LEAD.id);
              }}
            >
              <Segment id="front">Front page</Segment>
              <Segment id="article">Article</Segment>
            </SegmentedControl>
          </div>
          <div
            className={cn(
              "flex flex-wrap items-end justify-between gap-x-8 gap-y-2",
              story ? "mt-5 border-b border-border pb-3" : "mt-6 sm:mt-8",
            )}
          >
            <a
              href="#front"
              onClick={(event) => {
                event.preventDefault();
                go(null);
              }}
              className="-mx-1 rounded-md px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <motion.span
                layout={!reduce}
                transition={SETTLE}
                className={cn(
                  "block origin-left font-display font-semibold text-foreground",
                  story
                    ? "text-[2rem] leading-none tracking-[-0.045em]"
                    : "text-[clamp(4.25rem,21vw,16.75rem)] leading-[0.8] tracking-[-0.06em]",
                )}
              >
                Snowline
              </motion.span>
            </a>
            {story ? <p className="pb-1 text-[13px] text-muted-foreground">No. 31 · Winter 2027</p> : null}
          </div>
          {story ? null : (
            <div className="mt-5 border-t-2 border-foreground">
              <div className="flex items-baseline justify-between gap-x-6 gap-y-1 border-b border-border py-2.5 text-[13px] text-muted-foreground">
                <span className="tabular-nums">No. 31 · Winter 2027</span>
                <span className="hidden text-center md:inline">A field journal of the northern mountains</span>
                <span className="tabular-nums">Matsumoto · ¥1,400</span>
              </div>
            </div>
          )}
        </header>

        {story ? (
          <Article key={story.id} story={story} images={images} avatars={avatars} onOpen={go} onHome={() => go(null)} />
        ) : (
          <FrontPage images={images} avatars={avatars} onOpen={go} />
        )}

        <footer className="mt-20 flex flex-col gap-2 border-t border-border pt-5 text-[13px] text-muted-foreground sm:flex-row sm:justify-between">
          <p className="max-w-[46ch] text-pretty">
            Snowline is written and photographed in the northern prefectures and printed in Matsumoto, four times a
            year.
          </p>
          <p className="tabular-nums">The spring issue is out on 8 May 2027.</p>
        </footer>
      </div>
    </div>
  );
}

function FrontPage({
  images,
  avatars,
  onOpen,
}: {
  images: Partial<Record<FieldJournalImage, string>>;
  avatars: Record<string, string>;
  onOpen: (id: string) => void;
}) {
  return (
    <main>
      <article aria-labelledby="snowline-lead" className="pt-6 sm:pt-8">
        <a
          href={`#${LEAD.id}`}
          tabIndex={-1}
          aria-hidden="true"
          onClick={(event) => {
            event.preventDefault();
            onOpen(LEAD.id);
          }}
          className="group block overflow-clip rounded-2xl"
        >
          <Picture
            src={LEAD.image && images[LEAD.image]}
            alt=""
            className="aspect-[4/3] transition-[scale] duration-700 ease-settle group-hover:scale-[1.015] sm:aspect-[2/1] lg:aspect-[21/9] motion-reduce:transition-none"
          />
        </a>
        <div className="mt-6 grid gap-5 lg:mt-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="text-[13px] font-medium text-brand-strong">{LEAD.kicker}</p>
            <h2
              id="snowline-lead"
              className="mt-3 font-display text-[2.125rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.5rem]"
            >
              <StoryLink story={LEAD} onOpen={onOpen}>
                {LEAD.title}
              </StoryLink>
            </h2>
          </div>
          <div className="flex flex-col gap-5 lg:col-span-5 lg:pt-8">
            <p className="text-lg/7 text-pretty text-muted-foreground">{LEAD.standfirst}</p>
            <Byline story={LEAD} avatar={avatars[LEAD.author]} size="md" />
          </div>
        </div>
      </article>

      <section
        aria-label="More in this issue"
        className="mt-12 grid gap-x-10 gap-y-10 border-t border-border pt-8 md:grid-cols-2 lg:mt-14 lg:grid-cols-12 lg:gap-y-12 lg:pt-10"
      >
        <article className="md:col-span-2 lg:col-span-7">
          <Picture src={GLASS.image && images[GLASS.image]} alt={GLASS.alt} className="aspect-[3/2] rounded-xl" />
          <p className="mt-5 text-[13px] font-medium text-brand-strong">{GLASS.kicker}</p>
          <h3 className="mt-2 font-display text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.025em] text-balance">
            <StoryLink story={GLASS} onOpen={onOpen}>
              {GLASS.title}
            </StoryLink>
          </h3>
          <p className="mt-3 max-w-[52ch] text-base/7 text-pretty text-muted-foreground">{GLASS.standfirst}</p>
          <div className="mt-4">
            <Byline story={GLASS} avatar={avatars[GLASS.author]} />
          </div>
        </article>

        <article className="flex flex-col lg:col-span-5 lg:border-l lg:border-border lg:pl-10">
          <p className="text-[13px] font-medium text-brand-strong">{COLD.kicker}</p>
          <h3 className="mt-2 font-display text-2xl leading-[1.15] font-semibold tracking-[-0.02em] text-balance">
            <StoryLink story={COLD} onOpen={onOpen}>
              {COLD.title}
            </StoryLink>
          </h3>
          <figure className="my-7 border-y border-border py-6">
            <p className="font-display text-[4.5rem] leading-none font-semibold tracking-[-0.05em] text-foreground tabular-nums sm:text-[5.25rem]">
              −21.4<span className="ms-1 align-top text-[0.42em] tracking-normal text-muted-foreground">°C</span>
            </p>
            <figcaption className="mt-3 text-[13px] text-muted-foreground tabular-nums">
              Niseko station, 6 February, 05:50
            </figcaption>
          </figure>
          <p className="text-base/7 text-pretty text-muted-foreground">{COLD.standfirst}</p>
          <div className="mt-4">
            <Byline story={COLD} avatar={avatars[COLD.author]} />
          </div>
        </article>

        <article className="lg:col-span-4">
          <Picture src={TEA.image && images[TEA.image]} alt={TEA.alt} className="aspect-[4/3] rounded-xl" />
          <p className="mt-5 text-[13px] font-medium text-brand-strong">{TEA.kicker}</p>
          <h3 className="mt-2 font-display text-xl leading-[1.2] font-semibold tracking-[-0.02em] text-balance">
            <StoryLink story={TEA} onOpen={onOpen}>
              {TEA.title}
            </StoryLink>
          </h3>
          <p className="mt-2.5 text-[15px]/6 text-pretty text-muted-foreground">{TEA.standfirst}</p>
          <div className="mt-4">
            <Byline story={TEA} avatar={avatars[TEA.author]} />
          </div>
        </article>

        <article className="grid gap-6 md:col-span-2 lg:col-span-8 lg:border-l lg:border-border lg:pl-10 sm:grid-cols-2 sm:items-start">
          <Picture
            src={PLOUGH.image && images[PLOUGH.image]}
            alt={PLOUGH.alt}
            className="aspect-[4/3] rounded-xl sm:aspect-[4/5]"
          />
          <div className="flex flex-col sm:pt-1">
            <p className="text-[13px] font-medium text-brand-strong">{PLOUGH.kicker}</p>
            <h3 className="mt-2 font-display text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.025em] text-balance">
              <StoryLink story={PLOUGH} onOpen={onOpen}>
                {PLOUGH.title}
              </StoryLink>
            </h3>
            <p className="mt-3 text-base/7 text-pretty text-muted-foreground">{PLOUGH.standfirst}</p>
            <p className="mt-5 border-l-2 border-brand ps-4 text-[15px]/6 text-pretty text-foreground/85">
              The plough leaves the depot at 03:10. The first passenger train follows at 06:12, with nothing left to do
              but run.
            </p>
            <div className="mt-5">
              <Byline story={PLOUGH} avatar={avatars[PLOUGH.author]} />
            </div>
          </div>
        </article>
      </section>

      <section aria-labelledby="snowline-archive" className="mt-16 lg:mt-20">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 border-foreground pt-3">
          <h2 id="snowline-archive" className="font-display text-2xl font-semibold tracking-[-0.02em]">
            From the archive
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Four winters of Snowline. Open one to read the cover story.
          </p>
        </div>
        <ZoomGrid
          className="mt-5 md:h-[27rem]"
          closeLabel="Close cover story"
          cards={ARCHIVE.map((item) => ({
            id: item.id,
            src: images[item.image] ?? "",
            alt: item.alt,
            title: item.title,
            className: item.className,
            description: (
              <>
                <span className="block text-[13px] font-medium text-foreground/70 tabular-nums">{item.issue}</span>
                <span className="mt-1 block">{item.text}</span>
              </>
            ),
          }))}
        />
      </section>
    </main>
  );
}

function Article({
  story,
  images,
  avatars,
  onOpen,
  onHome,
}: {
  story: Story;
  images: Partial<Record<FieldJournalImage, string>>;
  avatars: Record<string, string>;
  onOpen: (id: string) => void;
  onHome: () => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const lead = story.id === LEAD.id;
  const sectionId = (key: string) => `${uid}-${key}`;
  const index = STORIES.findIndex((s) => s.id === story.id);
  const next = [1, 2].map((step) => STORIES[(index + step) % STORIES.length]);
  const heroImage = story.image ? images[story.image] : undefined;

  return (
    <main className="pt-6 sm:pt-10 lg:grid lg:grid-cols-[2.5rem_minmax(0,1fr)] lg:gap-x-8 xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-x-12">
      <header className="max-w-[48rem] lg:col-start-2">
        <button
          type="button"
          onClick={onHome}
          className="-ms-2 inline-flex h-8 items-center gap-1 rounded-md pe-2.5 ps-1.5 text-[13px] text-muted-foreground outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Front page
        </button>
        <p className="mt-6 text-[13px] font-medium text-brand-strong">{story.kicker}</p>
        <h1 className="mt-3 font-display text-[2.25rem] leading-[1.03] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[3.5rem]">
          {story.title}
        </h1>
        <p className="mt-5 max-w-[40rem] text-lg/7 text-pretty text-muted-foreground sm:text-xl/8">
          {story.standfirst}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-5 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-2.5">
            <Avatar src={avatars[story.author]} name={story.author} size="md" />
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{story.author}</span>
              <span>{story.role}</span>
            </span>
          </span>
          {lead ? <span>Photographs by Mateo Álvarez</span> : null}
          <span className="tabular-nums">13 February 2027 · {story.minutes} min read</span>
        </div>
      </header>

      <figure className="mt-8 lg:col-span-2 lg:mt-10">
        {story.image ? (
          <Picture src={heroImage} alt={story.alt} className="aspect-[4/3] rounded-2xl sm:aspect-[2/1]" />
        ) : (
          <div className="flex flex-col justify-between gap-10 rounded-2xl bg-muted p-6 sm:aspect-[3/1] sm:p-10">
            <p className="text-[13px] text-muted-foreground tabular-nums">Niseko station, 6 February 2027, 05:50</p>
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
              <p className="font-display text-[5rem] leading-[0.8] font-semibold tracking-[-0.05em] text-foreground tabular-nums sm:text-[8rem]">
                −21.4<span className="ms-1.5 align-top text-[0.4em] tracking-normal text-muted-foreground">°C</span>
              </p>
              <ColdScale />
            </div>
          </div>
        )}
        <figcaption className="mt-3 text-[13px] text-muted-foreground lg:ms-[4.5rem] xl:ms-[14rem]">
          {story.caption ?? "The reading against the forecast we issued at 17:00 the evening before."}
        </figcaption>
      </figure>

      {lead ? (
        <aside className="mt-16 hidden lg:block">
          <div className="sticky top-6">
            <StationNav
              aria-label="Post towns in this story"
              items={SECTIONS.map((s) => ({ id: sectionId(s.key), label: s.label, detail: s.detail }))}
            />
          </div>
        </aside>
      ) : null}

      <FieldNotes className={cn("mx-0 lg:col-start-2", lead ? "mt-2 lg:mt-4" : "mt-10 lg:mt-12")}>
        {lead ? <LeadBody sectionId={sectionId} images={images} /> : <ShortBody id={story.id} />}
      </FieldNotes>

      <div className="mt-14 lg:col-start-2">
        <div className="flex max-w-[36rem] gap-4 border-y border-border py-6">
          <Avatar src={avatars[story.author]} name={story.author} size="lg" />
          <p className="text-[15px]/6 text-pretty text-muted-foreground">
            <span className="font-medium text-foreground">{story.author}</span> {BIOS[story.id]}
          </p>
        </div>

        <nav aria-label="Next in this issue" className="mt-12">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">Next in this issue</h2>
          <ul className="mt-5 grid gap-6 sm:grid-cols-2">
            {next.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onOpen(item.id);
                  }}
                  className="group flex gap-4 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                >
                  {item.image ? (
                    <span className="w-28 shrink-0 overflow-clip rounded-lg sm:w-32">
                      <Picture
                        src={images[item.image]}
                        alt=""
                        className="aspect-[4/3] transition-[scale] duration-500 ease-settle group-hover:scale-[1.04] motion-reduce:transition-none"
                      />
                    </span>
                  ) : (
                    <span className="grid aspect-[4/3] w-28 shrink-0 place-items-center rounded-lg bg-muted font-display text-xl font-semibold tracking-[-0.03em] text-foreground tabular-nums sm:w-32">
                      −21.4°
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[13px] text-muted-foreground">{item.kicker}</span>
                    <span className="font-display text-[17px] leading-snug font-semibold tracking-[-0.01em] text-balance decoration-foreground/30 underline-offset-[0.18em] group-hover:underline">
                      {item.title}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}

const BIOS: Record<string, string> = {
  "kiso-road":
    "is a mountain guide in Matsumoto. She has walked the Kiso road in every month of the year and prefers February.",
  "otaru-glass":
    "photographs work and weather in Hokkaido. He has spent six winters in Otaru and still gets lost behind the canal.",
  "coldest-morning":
    "forecasts for the northern prefectures. She keeps a paper notebook of every morning colder than −15 °C.",
  "tea-altitude":
    "buys green tea from eleven farms for a small roaster in Murakami. She carries a thermometer on every hike.",
  "snow-plough": "keeps the trains moving on the lines around Otaru. He has ridden the plough every winter since 2019.",
};

function ColdScale() {
  const at = (v: number) => `${((v + 25) / 15) * 100}%`;
  const ticks = Array.from({ length: 16 }, (_, i) => -25 + i);
  return (
    <div
      role="img"
      aria-label="Measured −21.4 °C, forecast −20 °C"
      className="relative h-20 w-full shrink-0 md:mb-2 md:w-[22rem] lg:w-[26rem]"
    >
      <span className="absolute inset-x-0 top-10 h-px bg-border-strong" />
      {ticks.map((v) => (
        <span
          key={v}
          className={cn(
            "absolute top-10 w-px -translate-x-1/2",
            v % 5 === 0 ? "h-2.5 bg-muted-foreground" : "h-1.5 bg-border-strong",
          )}
          style={{ left: at(v) }}
        />
      ))}
      {[-25, -20, -15, -10].map((v) => (
        <span
          key={v}
          className="absolute top-14 -translate-x-1/2 text-xs text-muted-foreground tabular-nums"
          style={{ left: at(v) }}
        >
          {String(v).replace("-", "−")}
        </span>
      ))}
      <span
        className="absolute top-4 h-6 w-px -translate-x-1/2 border-l border-dashed border-muted-foreground"
        style={{ left: at(-20) }}
      />
      <span className="absolute top-0 ms-2 text-xs whitespace-nowrap text-muted-foreground" style={{ left: at(-20) }}>
        Forecast −20.0
      </span>
      <span className="absolute top-1 h-9 w-0.5 -translate-x-1/2 rounded-full bg-brand" style={{ left: at(-21.4) }} />
      <span
        className="absolute top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
        style={{ left: at(-21.4) }}
      />
      <span
        className="absolute top-0 -translate-x-full pe-2 text-xs font-medium whitespace-nowrap text-brand-strong"
        style={{ left: at(-21.4) }}
      >
        Measured
      </span>
    </div>
  );
}

function SectionTitle({ id, label, detail }: { id: string; label: string; detail: string }) {
  return (
    <h2
      id={id}
      className="mt-12! flex scroll-mt-6 flex-wrap items-baseline gap-x-3 font-display text-2xl leading-tight font-semibold tracking-[-0.02em] text-foreground"
    >
      {label}
      <span className="font-sans text-sm font-normal tracking-normal text-muted-foreground tabular-nums">{detail}</span>
    </h2>
  );
}

function LeadBody({
  sectionId,
  images,
}: {
  sectionId: (key: string) => string;
  images: Partial<Record<FieldJournalImage, string>>;
}) {
  const title = (i: number) => {
    const s = SECTIONS[i];
    return <SectionTitle id={sectionId(s.key)} label={s.label} detail={s.detail} />;
  };
  return (
    <>
      {title(0)}
      <p className={dropCap}>
        Narai wakes late in winter. At seven the long street of inns was still shuttered, the lattice fronts grey with
        frost, and the only sound was water running into the stone troughs that the town keeps from freezing. I filled
        my bottle at the one by the shrine, because everyone said I should, and it was warmer than the air.
      </p>
      <p>
        The Nakasendō ran from Edo to Kyoto through the mountains rather than along the coast, and its stretch through
        the Kiso valley is the part that survives. I meant to go from the first of the eleven{" "}
        <Note note="Sixty-nine of them between Edo and Kyoto, a day apart on foot, each with an inn for officials and fresh horses for the relay. Travellers called them stations.">
          post towns
        </Note>{" "}
        here to the last, walking where the old road is still a path and taking the train where it has become a highway.
      </p>

      {title(1)}
      <p>
        The road climbs out of Narai straight into cedar. The stone paving gives out after the first bend, and from
        there it is a trench through the snow, packed by snowshoes and just wide enough for one. The pass is three
        kilometres on, at{" "}
        <Note
          mark="circle"
          markColor="var(--brand)"
          note="Not high, but the snow lies late on the north side. It was deeper here than anywhere else on the road."
        >
          1,197 metres
        </Note>
        , and I did not meet a soul.
      </p>
      <p>
        At the top there is a small shrine and a stone lantern wearing a cap of snow. On a clear day you can see Ontake
        from here, the volcano the old pilgrims walked toward. I saw a white wall of cloud, then for about a minute a
        white wall of mountain, then cloud again, and ate my rice balls on the bench outside{" "}
        <Note note="Shut from December to March. The bench outside is not, and it gets the morning sun.">
          the tea house below the pass
        </Note>
        .
      </p>

      {title(2)}
      <p>
        Yabuhara made wooden combs for the whole country, and a few workshops still do. In one, a woman was cutting
        teeth into a blank of boxwood with a saw finer than a hair,{" "}
        <BrushAnnotation kind="underline" color="var(--brand)">
          eighty teeth in a comb no wider than my palm
        </BrushAnnotation>
        , by eye. She has been doing it for fifty-one years. When I asked how she keeps them even, she said the wood
        decides.
      </p>
      <p>
        I slept at an inn of eight rooms where I was the only guest. Dinner was river fish, mountain vegetables pickled
        in October, and rice cooked in an iron pot over the hearth in the room where we ate. The owner&apos;s son read
        the forecast off his phone and said the snow would hold until Thursday.
      </p>

      {title(3)}
      <p>
        Below Yabuhara the old road and the new one become the same road, and the trucks do not slow down for walkers. I
        took the train for two stops instead. The timetable on the platform said it would leave at{" "}
        <Note
          mark="strike"
          markColor="var(--chart-5)"
          note="Winter timetables move the morning trains back three minutes. Nobody had changed the paper one."
        >
          9:38
        </Note>
        ; it left at 9:41, and arrived exactly when it meant to.
      </p>
      <p>
        Fukushima was the checkpoint, where guards searched travellers for guns going into Edo and for women leaving it.
        Now it is the largest town in the valley, with a hot spring by the river and a bakery that opens at seven. I
        spent the afternoon in the first and the next morning in the second.
      </p>
      <Figure caption="Left, the river at Kiso-Fukushima, where the hot spring runs into it. Right, Tsumago at ten past seven, before the shops opened.">
        <div className="grid grid-cols-2 gap-1.5 bg-background">
          <Picture src={images["fukushima-river"]} alt="A river running between snowy banks" className="aspect-[4/5]" />
          <Picture src={images["tsumago-morning"]} alt="A valley of wooden houses at dawn" className="aspect-[4/5]" />
        </div>
      </Figure>

      {title(4)}
      <p>
        The highway takes the valley floor for the next forty kilometres, so I rode it as far as Nagiso and walked up to
        Tsumago as the lamps came on. Tsumago is the town on the posters, and in summer you queue to walk down its
        street. In February{" "}
        <BrushAnnotation kind="highlight" color="var(--chart-4)">
          the street was mine and the snow&apos;s
        </BrushAnnotation>
        . The town decided fifty years ago to keep its houses as they were, with no power lines on the main road, and
        from the hill above it looks like a woodblock print nobody has coloured in.
      </p>
      <p>
        The woman who runs the inn by the water wheel has kept it for thirty years. We sat by the hearth until late, and
        she drew me the path to Magome on the back of a receipt.
      </p>
      <blockquote className="mt-10! mb-4! border-s-2 border-brand ps-5 sm:ps-6">
        <p className="font-display text-[1.625rem]/[1.22] font-semibold tracking-[-0.025em] text-balance text-foreground sm:text-[1.875rem]/[1.18]">
          “The winter guests are the ones I remember. They come for the quiet, and then they sit up talking.”
        </p>
        <footer className="mt-3 text-sm text-muted-foreground">The innkeeper at Tsumago</footer>
      </blockquote>

      {title(5)}
      <p>
        The last eight kilometres cross into Gifu at Magome Pass, 801 metres, through forest so quiet I could hear snow
        sliding off branches far below. There are{" "}
        <Note note="Hung on posts every few hundred metres. The sound carries a long way over snow.">bear bells</Note>{" "}
        on the way. In winter the bears are asleep, and you ring them anyway.
      </p>
      <p>
        Magome sits on a ridge facing south, and when I came down into it at three the sun was on the stone steps and
        the snow had gone soft. I had covered seventy-five kilometres of the old road, fifty-eight of them on a train,
        and I would not give back a step. I bought a bag of chestnut sweets, sat on the steps of the old inn for
        officials, and watched the bus to Nakatsugawa arrive, wait four minutes, and leave without me.
      </p>
    </>
  );
}

function ShortBody({ id }: { id: string }) {
  if (id === "otaru-glass") {
    return (
      <>
        <p className={dropCap}>
          The canal in Otaru freezes from the edges inward, and by the middle of February only a dark channel is left
          down the centre where the ducks keep it open. Two streets back, in a brick warehouse that once stored herring,
          the furnace at Tsurara Glassworks runs at{" "}
          <Note note="Hot enough to keep the glass workable. It is let down to 1,000 degrees overnight, never lower.">
            1,180 degrees
          </Note>{" "}
          and has not been allowed to cool for thirty-nine years.
        </p>
        <p>
          Haruto Ishikawa starts at six, before the town is light. He gathers glass on the end of a pipe, turns it,
          blows, turns it again, and in four minutes there is a float the size of a grapefruit cooling in a bed of sand.
          Fishing boats used to buy them by the thousand. Now they go to inns, and to people who want something on the
          windowsill that catches the low winter sun.
        </p>
        <p>
          “Glass and snow have the same problem,” he said, wiping down the bench between pieces. “Everything shows.” So
          he works slowly and cleans as he goes, and at a quarter past four, when the gas lamps come on along the canal,
          he banks the furnace for the night and walks home through the snow.
        </p>
      </>
    );
  }
  if (id === "coldest-morning") {
    return (
      <>
        <p className={dropCap}>
          At 05:50 on 6 February the thermometer at our Niseko station read{" "}
          <BrushAnnotation kind="circle" color="var(--brand)">
            −21.4 °C
          </BrushAnnotation>
          , the coldest morning there in eleven years. We had forecast −20 the evening before, which in my trade counts
          as a good day. The reason it went lower is the reason it went that low at all: the sky was perfectly clear,
          there was no wind, and the snow was new.
        </p>
        <p>
          Fresh snow is mostly air. It insulates the ground so well that the surface loses heat to the sky faster than
          the earth below can replace it, and on a still night the coldest air drains downhill and pools in the valley
          like water in a bowl. The town sits at the bottom of the bowl.
        </p>
        <p>
          We watch for three things: a clear sky after midnight, wind under two metres a second, and more than{" "}
          <Note note="Measured on the board at the station at 18:00. That evening it was 31 centimetres.">
            twenty centimetres of new snow
          </Note>
          . When all three line up we add two degrees of cold to the model and tell the road crews. This time we should
          have added three.
        </p>
      </>
    );
  }
  if (id === "tea-altitude") {
    return (
      <>
        <p className={dropCap}>
          Water boils at a lower temperature the higher you go, about one degree for every three hundred metres. At the
          hut below the summit, a little over two thousand metres up, my kettle boiled at 93 °C, which is perfect for a
          sencha and a disappointment for nearly everything else.
        </p>
        <p>
          Green tea likes cooler water than you would think. A first-flush sencha wants 70 °C, a gyokuro as little as
          55. Pour boiling water on either and you draw out the bitterness before the sweetness has had a chance. Up
          high you are most of the way there already:{" "}
          <BrushAnnotation kind="underline" color="var(--brand)">
            pour into the cups first, then into the pot
          </BrushAnnotation>
          , and the water is right.
        </p>
        <p>
          Roasted teas are the exception. A{" "}
          <Note note="Green tea roasted over charcoal until the leaf turns brown. It has almost no bitterness and very little caffeine.">
            hōjicha
          </Note>{" "}
          wants water as hot as you can make it, and at 93 °C it comes out thin. Up high I brew it for twice as long
          with a little more leaf, and drink it holding the cup in both hands, which is the point of it anyway.
        </p>
      </>
    );
  }
  return (
    <>
      <p className={dropCap}>
        The plough leaves Otaru depot at 03:10, three hours before the first passenger train, and its job is to make
        sure that train has nothing to do but run. It is a diesel with a steel wedge on the front the height of a
        person, and from the cab you see nothing but snow coming at the glass in the headlights, a white tunnel that
        does not end.
      </p>
      <p>
        On a heavy night the drifts in the cuttings past{" "}
        <Note note="The line runs along the shore here, between the cliffs and the sea. The wind fills the cuttings again within hours.">
          Ranshima
        </Note>{" "}
        are deeper than the wedge is tall. The driver slows to walking pace and the plough shoulders through with a
        sound like a wave breaking on a car roof. Behind us a second crew clears the points by hand, with brooms and gas
        burners, at every station we pass.
      </p>
      <p>
        We reached Kutchan at 05:20 and turned for home. The first train out of Otaru that morning left on time, at
        06:12, with eleven passengers and no idea what had gone before it, which is how we like it.
      </p>
    </>
  );
}

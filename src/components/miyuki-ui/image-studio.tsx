"use client";

import {
  BookOpen,
  Check,
  Download,
  Images,
  Palette,
  PanelLeft,
  PanelRight,
  RectangleHorizontal,
  RefreshCw,
  Snowflake,
  TrainFront,
  WandSparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Key } from "react-aria-components";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button, buttonStyles } from "@/components/miyuki-ui/button";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { DevelopingImage } from "@/components/miyuki-ui/developing-image";
import { Drawer } from "@/components/miyuki-ui/drawer";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { PromptBox, type PromptBoxStatus } from "@/components/miyuki-ui/prompt-box";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { ThinkingGlyph } from "@/components/miyuki-ui/thinking-glyph";
import { cn } from "@/lib/utils";

function useMedia(query: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface GeneratedImage {
  id: string;
  src: string;
  alt: string;
  prompt?: string;
  ratio?: number;
}

export interface ImageStyle {
  id: string;
  name: string;
  description?: string;
  src: string;
}

interface Turn {
  id: string;
  prompt: string;
  title: string;
  image: GeneratedImage;
  generating: boolean;
  run: number;
  liked: boolean;
  chosen: boolean;
  seconds: number;
}

const teams = [
  { id: "paper-pine", name: "Paper & Pine", plan: "Studio, 6 people", logo: <Palette /> },
  { id: "kitakaze", name: "Kitakaze Outfitters", plan: "Brand team, 4 people" },
];

const navItems: FloatingSidebarItem[] = [
  { id: "create", label: "Create", icon: <WandSparkles /> },
  { id: "gallery", label: "Gallery", icon: <Images />, count: 184 },
  { id: "styles", label: "Styles", icon: <Palette /> },
];

const navGroups: FloatingSidebarGroup[] = [
  {
    label: "Collections",
    items: [
      { id: "posters", label: "Winter posters 2027", icon: <Snowflake />, count: 42 },
      { id: "covers", label: "Hut guide covers", icon: <BookOpen />, count: 17 },
      { id: "rail", label: "Rail timetable art", icon: <TrainFront />, count: 9 },
    ],
  },
];

const defaultUser: FloatingSidebarUser = { name: "Mei Watanabe", email: "mei@paperandpine.example" };

const models = [
  { id: "draft", name: "Draft", description: "Fast, for trying ideas." },
  { id: "fine", name: "Fine mesh", description: "Slower. Sharper edges and cleaner snow." },
];

const defaultPrompt =
  "Lake Tōya at dusk from the north shore, the island dark in the middle of the lake, first lamps on the far side, a little snow on the stones. Wide and quiet, no people.";

function size(ratio = 1.5) {
  const long = 1536;
  return ratio >= 1 ? `${long} × ${Math.round(long / ratio)}` : `${Math.round(long * ratio)} × ${long}`;
}

function aspectName(ratio = 1.5) {
  const known: [number, string][] = [
    [1, "1:1"],
    [1.5, "3:2"],
    [4 / 3, "4:3"],
    [16 / 9, "16:9"],
    [2 / 3, "2:3"],
    [3 / 4, "3:4"],
    [4 / 5, "4:5"],
  ];
  return known.reduce((best, k) => (Math.abs(k[0] - ratio) < Math.abs(best[0] - ratio) ? k : best))[1];
}

function slug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function shorten(prompt: string) {
  const first = prompt.split(/[,.;]/)[0].trim();
  return first.length > 44 ? `${first.slice(0, 42).trimEnd()}…` : first;
}

function extension(src: string) {
  if (src.startsWith("data:image/svg")) return "svg";
  if (src.startsWith("data:image/png")) return "png";
  const named = src.startsWith("data:") ? null : /\.(webp|png|jpe?g|gif|avif|svg)(?:[?#]|$)/i.exec(src);
  return named ? named[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function Frame({
  turn,
  latest,
  styleName,
  onDone,
  onLike,
  onRegenerate,
}: {
  turn: Turn;
  latest: boolean;
  styleName?: string;
  onDone: () => void;
  onLike: () => void;
  onRegenerate: () => void;
}) {
  const reduce = useReducedMotion();
  const ratio = turn.image.ratio ?? 1.5;
  const title = turn.chosen ? turn.image.alt : turn.title;
  return (
    <figure className="flex flex-col gap-3">
      <div
        className="relative mx-auto overflow-clip rounded-2xl bg-muted shadow-sm ring-1 ring-foreground/5"
        style={{ aspectRatio: ratio, width: `min(100%, calc(46dvh * ${ratio}))` }}
      >
        {turn.generating ? (
          <DevelopingImage
            key={`${turn.image.id}-${turn.run}`}
            src={turn.image.src}
            alt={title}
            duration={4.5}
            onDone={onDone}
            className="absolute inset-0"
          />
        ) : (
          <motion.img
            key={`${turn.image.id}-${turn.run}`}
            src={turn.image.src}
            alt={title}
            draggable={false}
            initial={turn.chosen ? { opacity: 0, scale: reduce ? 1 : 1.015 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>
      <figcaption className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
        {turn.generating ? (
          <ThinkingGlyph variant="writing" label={`Generating ${size(ratio)}`} showElapsed className="text-[13px]" />
        ) : (
          <p className="min-w-0 flex-1 truncate text-[13px] leading-5 text-muted-foreground">
            <span className="font-medium text-foreground">{title}</span>
            <span aria-hidden="true"> · </span>
            {turn.chosen ? "from your gallery" : size(ratio)}
            {styleName && !turn.chosen && (
              <>
                <span aria-hidden="true"> · </span>
                {styleName}
              </>
            )}
            {!turn.chosen && (
              <>
                <span aria-hidden="true"> · </span>
                {turn.seconds}&nbsp;s
              </>
            )}
          </p>
        )}
        <div className="ms-auto flex items-center gap-1.5">
          <IconButton
            variant="secondary"
            size="sm"
            aria-label={turn.liked ? "Remove like" : "Like"}
            aria-pressed={turn.liked}
            isDisabled={turn.generating}
            onPress={onLike}
            className={cn(
              "text-muted-foreground data-[hovered]:text-foreground",
              turn.liked && "text-brand data-[hovered]:text-brand",
            )}
          >
            <MorphIcon shapes={morphIcons.heartFilled} shape={turn.liked ? "filled" : "outline"} size={16} />
          </IconButton>
          {latest && (
            <Button
              variant="secondary"
              size="sm"
              iconStart={<RefreshCw />}
              isDisabled={turn.generating}
              onPress={onRegenerate}
              aria-label="Generate again"
              className="max-sm:w-8 max-sm:px-0"
            >
              <span className="max-sm:hidden">Generate again</span>
            </Button>
          )}
          <a
            href={turn.generating ? undefined : turn.image.src}
            download={`${slug(title) || "image"}.${extension(turn.image.src)}`}
            aria-disabled={turn.generating || undefined}
            className={cn(
              buttonStyles({ variant: "secondary", size: "sm" }),
              "hover:bg-accent max-sm:w-8 max-sm:px-0",
              turn.generating && "pointer-events-none opacity-50",
            )}
          >
            <Download aria-hidden="true" />
            <span className="max-sm:sr-only">Download</span>
          </a>
        </div>
      </figcaption>
    </figure>
  );
}

function Gallery({
  images,
  selected,
  onPick,
}: {
  images: GeneratedImage[];
  selected: string | null;
  onPick: (image: GeneratedImage) => void;
}) {
  return (
    <ul aria-label="Generated images" className="columns-2 gap-2 [&>li]:mb-2 [&>li]:break-inside-avoid">
      {images.map((img) => {
        const on = img.id === selected;
        return (
          <li key={img.id}>
            <button
              type="button"
              aria-pressed={on}
              aria-label={img.alt}
              onClick={() => onPick(img)}
              className={cn(
                "group/tile relative block w-full cursor-default overflow-clip rounded-lg bg-muted outline-none",
                "ring-offset-2 ring-offset-card transition-shadow duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
                on && "ring-2 ring-brand",
              )}
            >
              <img
                src={img.src}
                alt=""
                draggable={false}
                loading="lazy"
                className="block w-full object-cover transition-transform duration-300 ease-settle group-hover/tile:scale-[1.03] motion-reduce:transition-none"
                style={{ aspectRatio: img.ratio ?? 1 }}
              />
              {img.prompt && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-6 pb-1.5 text-start text-[11px] leading-[14px] text-white opacity-0 transition-opacity duration-200 group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100">
                  <span className="line-clamp-2">{img.prompt}</span>
                </span>
              )}
              {on && (
                <span className="absolute top-1.5 end-1.5 grid size-5 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm">
                  <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Styles({
  styles,
  selected,
  onPick,
}: {
  styles: ImageStyle[];
  selected: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <ul aria-label="Styles" className="grid grid-cols-2 gap-x-2.5 gap-y-4">
      {styles.map((s) => {
        const on = s.id === selected;
        return (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(s.id)}
              className="group/style flex w-full cursor-default flex-col gap-2 rounded-xl text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "relative block overflow-clip rounded-lg bg-muted ring-offset-2 ring-offset-card transition-shadow duration-150",
                  on ? "ring-2 ring-brand" : "ring-1 ring-foreground/5",
                )}
              >
                <img
                  src={s.src}
                  alt=""
                  draggable={false}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 ease-settle group-hover/style:scale-[1.03] motion-reduce:transition-none"
                />
                {on && (
                  <span className="absolute top-1.5 end-1.5 grid size-5 place-items-center rounded-full bg-brand text-brand-foreground shadow-sm">
                    <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
                  </span>
                )}
              </span>
              <span className="flex flex-col px-0.5">
                <span className={cn("text-sm leading-5 font-medium", on && "text-brand-strong")}>{s.name}</span>
                {s.description && <span className="text-xs leading-4 text-muted-foreground">{s.description}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export interface ImageStudioProps extends ComponentProps<"div"> {
  variants: GeneratedImage[];
  gallery: GeneratedImage[];
  styles: ImageStyle[];
  prompt?: string;
  defaultStyle?: string;
  user?: FloatingSidebarUser;
}

export function ImageStudio({
  variants,
  gallery,
  styles,
  prompt = defaultPrompt,
  defaultStyle,
  user = defaultUser,
  className,
  ...props
}: ImageStudioProps) {
  const lg = useMedia("(min-width: 1024px)");
  const xl = useMedia("(min-width: 1280px)");
  const [menu, setMenu] = useState(false);
  const [panelChoice, setPanelChoice] = useState<boolean | null>(null);
  const [railChoice, setRailChoice] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Key>("gallery");
  const [style, setStyle] = useState<string | null>(defaultStyle ?? styles[0]?.id ?? null);
  const [images, setImages] = useState(gallery);
  const [picked, setPicked] = useState<string | null>(null);
  const [next, setNext] = useState(1);
  const [turns, setTurns] = useState<Turn[]>(() =>
    variants[0]
      ? [
          {
            id: "t-0",
            prompt,
            title: variants[0].alt,
            image: variants[0],
            generating: true,
            run: 0,
            liked: false,
            chosen: false,
            seconds: 0,
          },
        ]
      : [],
  );
  const started = useRef(new Map<string, number>());
  const scroller = useRef<HTMLDivElement>(null);
  const follow = useRef(false);

  const panelOpen = panelChoice ?? lg;
  const rail = railChoice ?? (panelOpen && !xl);
  const latest = turns[turns.length - 1];
  const busy = latest?.generating ?? false;
  const status: PromptBoxStatus = busy ? "streaming" : "idle";
  const styleName = styles.find((s) => s.id === style)?.name;
  const title = turns[0]?.title ?? "New image";

  useEffect(() => {
    const el = scroller.current;
    if (!el || !follow.current) return;
    follow.current = false;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  useEffect(() => {
    for (const t of turns) {
      const key = `${t.id}-${t.run}`;
      if (t.generating && !started.current.has(key)) started.current.set(key, performance.now());
    }
  }, [turns]);

  function finish(id: string) {
    setTurns((list) =>
      list.map((t) => {
        if (t.id !== id || !t.generating) return t;
        const began = started.current.get(`${t.id}-${t.run}`);
        const seconds = began ? Math.max(1, Math.round((performance.now() - began) / 1000)) : 5;
        return { ...t, generating: false, seconds };
      }),
    );
    const done = turns.find((t) => t.id === id);
    if (done && !done.chosen) {
      const key = `${done.id}-${done.run}`;
      setImages((list) =>
        list.some((g) => g.id === key)
          ? list
          : [{ ...done.image, id: key, alt: done.title, prompt: done.prompt }, ...list],
      );
    }
  }

  function regenerate() {
    if (!latest || variants.length === 0) return;
    const image = variants[next % variants.length];
    setNext((n) => n + 1);
    setPicked(null);
    setTurns((list) =>
      list.map((t) =>
        t.id === latest.id ? { ...t, image, generating: true, run: t.run + 1, liked: false, chosen: false } : t,
      ),
    );
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || busy || variants.length === 0) return;
    const image = variants[next % variants.length];
    setNext((n) => n + 1);
    setPicked(null);
    follow.current = true;
    setTurns((list) => [
      ...list,
      {
        id: `t-${Date.now()}`,
        prompt: clean,
        title: shorten(clean),
        image,
        generating: true,
        run: 0,
        liked: false,
        chosen: false,
        seconds: 0,
      },
    ]);
  }

  function stop() {
    if (!latest) return;
    setTurns((list) => list.map((t) => (t.id === latest.id ? { ...t, generating: false, seconds: 0 } : t)));
  }

  function pick(image: GeneratedImage) {
    if (!latest || busy) return;
    setPicked(image.id);
    setTurns((list) =>
      list.map((t) => (t.id === latest.id ? { ...t, image, chosen: true, liked: false, run: t.run + 1 } : t)),
    );
    if (!lg) setPanelChoice(false);
  }

  function chooseStyle(id: string) {
    setStyle((s) => (s === id ? null : id));
  }

  const sidebar = (drawer: boolean) => (
    <FloatingSidebar
      teams={teams}
      items={navItems}
      groups={navGroups}
      user={user}
      defaultCurrent="create"
      onNavigate={() => setMenu(false)}
      collapsed={drawer ? false : rail}
      onCollapsedChange={drawer ? undefined : setRailChoice}
      collapsible={!drawer}
      className={drawer ? "min-h-0 flex-1" : "hidden lg:flex"}
    />
  );

  const panel = (
    <Tabs selectedKey={tab} onSelectionChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="flex shrink-0 items-end gap-2 border-b border-border ps-4 pe-2">
        <TabList aria-label="Library" className="mx-0 bg-none px-0">
          <Tab id="gallery" count={images.length}>
            Gallery
          </Tab>
          <Tab id="styles">Styles</Tab>
        </TabList>
        <CloseButton
          size="lg"
          aria-label="Close panel"
          onPress={() => {
            setPanelChoice(false);
            setRailChoice(null);
          }}
          className="ms-auto mb-1 self-center"
        />
      </div>
      <TabPanel id="gallery" className="min-h-0 flex-1 overflow-y-auto rounded-none p-3 [scrollbar-width:thin]">
        <p className="mb-2.5 px-1 text-xs text-muted-foreground">
          {busy
            ? "Wait for the image to finish, then choose one to show it in the frame."
            : "Choose an image to show it in the frame."}
        </p>
        <Gallery images={images} selected={picked} onPick={pick} />
      </TabPanel>
      <TabPanel id="styles" className="min-h-0 flex-1 overflow-y-auto rounded-none p-4 [scrollbar-width:thin]">
        <p className="mb-3 text-xs text-muted-foreground">
          {styleName ? `${styleName} applies to your next image.` : "No style. Images follow the prompt alone."}
        </p>
        <Styles styles={styles} selected={style} onPick={chooseStyle} />
      </TabPanel>
    </Tabs>
  );

  return (
    <div {...props} className={cn("flex h-dvh gap-3 bg-background p-3 text-foreground", className)}>
      <style href="miyuki-image-studio" precedence="miyuki">{`
        @keyframes miyuki-image-studio-panel { from { opacity: 0; transform: translateX(12px); } }
      `}</style>
      {sidebar(false)}
      <Drawer
        side="left"
        isOpen={menu && !lg}
        onOpenChange={setMenu}
        closeButton={false}
        aria-label="Sidebar"
        className="w-[264px] border-0 bg-transparent shadow-none"
      >
        {sidebar(true)}
      </Drawer>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center gap-2 ps-0.5 lg:ps-2">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open sidebar"
            onPress={() => setMenu(true)}
            className="text-muted-foreground data-[hovered]:text-foreground lg:hidden"
          >
            <PanelLeft />
          </IconButton>
          <Breadcrumbs className="min-w-0 flex-nowrap">
            <Breadcrumb href="#" className="max-sm:hidden">
              Create
            </Breadcrumb>
            <Breadcrumb>{title}</Breadcrumb>
          </Breadcrumbs>
          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              iconStart={<Images />}
              onPress={() => setPanelChoice(true)}
              className="lg:hidden"
            >
              Gallery
            </Button>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={panelOpen ? "Hide gallery" : "Show gallery"}
              aria-expanded={panelOpen}
              onPress={() => {
                setPanelChoice(!panelOpen);
                setRailChoice(null);
              }}
              className={cn(
                "text-muted-foreground data-[hovered]:text-foreground max-lg:hidden",
                panelOpen && "bg-accent text-foreground",
              )}
            >
              <PanelRight />
            </IconButton>
          </div>
        </header>

        <div
          ref={scroller}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,#000_20px)] [scrollbar-gutter:stable] [scrollbar-width:thin]"
        >
          <div className="mx-auto flex w-full max-w-[48rem] flex-1 flex-col px-1 pt-6 pb-8 sm:px-6">
            <p className="mb-6 text-center text-xs text-muted-foreground">Tuesday 16 February, 14:20</p>
            <ol aria-label="Prompts" className="flex flex-col gap-10">
              {turns.map((t) => (
                <li key={t.id} className="flex flex-col gap-5">
                  <div className="flex justify-end ps-10 sm:ps-20">
                    <p className="rounded-2xl rounded-ee-md bg-secondary px-4 py-2.5 text-base leading-7 text-secondary-foreground ring-1 ring-foreground/5 ring-inset [overflow-wrap:anywhere]">
                      {t.prompt}
                    </p>
                  </div>
                  <Frame
                    turn={t}
                    latest={t.id === latest?.id}
                    styleName={styleName}
                    onDone={() => finish(t.id)}
                    onLike={() => setTurns((list) => list.map((x) => (x.id === t.id ? { ...x, liked: !x.liked } : x)))}
                    onRegenerate={regenerate}
                  />
                </li>
              ))}
            </ol>
          </div>
          <div className="sticky bottom-0 z-10 mx-auto w-full max-w-[48rem] sm:px-6">
            <div aria-hidden="true" className="h-6 bg-gradient-to-t from-background to-transparent" />
            <div className="bg-background pb-1">
              <PromptBox
                placeholder="Describe the next image"
                models={models}
                defaultModel="fine"
                showAttach={false}
                status={status}
                onSend={send}
                onStop={stop}
                maxRows={5}
                context={[
                  ...(styleName ? [{ id: "style", icon: <Palette />, label: styleName }] : []),
                  { id: "size", icon: <RectangleHorizontal />, label: `${aspectName(1.5)}, ${size(1.5)}` },
                ]}
              />
            </div>
          </div>
        </div>
      </main>

      {panelOpen && (
        <aside
          aria-label="Gallery and styles"
          className="hidden w-[340px] shrink-0 flex-col overflow-clip rounded-2xl border border-border bg-card shadow-md motion-safe:animate-[miyuki-image-studio-panel_240ms_cubic-bezier(0.22,1,0.36,1)] lg:flex xl:w-[380px]"
        >
          {panel}
        </aside>
      )}
      <Drawer
        side="bottom"
        isOpen={panelOpen && !lg}
        onOpenChange={(open) => {
          if (!open) setPanelChoice(false);
        }}
        aria-label="Gallery and styles"
        className="h-[85%]"
      >
        <div className="flex min-h-0 flex-1 flex-col">{panel}</div>
      </Drawer>
    </div>
  );
}

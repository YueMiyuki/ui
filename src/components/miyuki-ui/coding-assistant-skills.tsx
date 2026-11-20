"use client";

import { FileText, MessageCircle, Pencil, Plus, Trash } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { CodeBlock } from "@/components/miyuki-ui/code-block";
import {
  EASE_OUT,
  MetaDot,
  PageBody,
  PageHeader,
  type ProjectId,
  projectIds,
} from "@/components/miyuki-ui/coding-assistant-shared";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import { EmptyState } from "@/components/miyuki-ui/empty-state";
import { FileDropzone } from "@/components/miyuki-ui/file-dropzone";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import { AlertDialog } from "@/components/miyuki-ui/modal";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { Skeleton } from "@/components/miyuki-ui/skeleton";
import { Switch } from "@/components/miyuki-ui/switch";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { TextArea } from "@/components/miyuki-ui/textarea";
import { toast } from "@/components/miyuki-ui/toast";
import { cn } from "@/lib/utils";

export type SkillScope = "workspace" | ProjectId;

export interface SkillFile {
  name: string;
  size: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  scope: SkillScope;
  uses: number;
  active: boolean;
  whenToUse: string[];
  instructions: string;
  example?: { file: string; lang: string; code: string };
  files: SkillFile[];
  recent: string[];
}

export type SkillDraft = Pick<Skill, "name" | "description" | "scope" | "instructions" | "files"> & { when: string };

const stationExample = `const res = await fetch("/api/stations?fields=latest", {
  next: { revalidate: 600 },
});
const stations: StationSummary[] = await res.json();`;

export const initialSkills: Skill[] = [
  {
    id: "station-data",
    name: "Station data",
    description: "How to read and cache readings from the station API.",
    scope: "forecast-web",
    uses: 48,
    active: true,
    whenToUse: [
      "A task reads or shows station readings",
      "A page loads slowly because of the stations API",
      "Tests need realistic readings",
    ],
    instructions:
      "Readings come from `/api/stations`. Ask for `fields=latest` unless the task needs history, and load a station's history with `/api/stations/:id/history` only when its row opens.\n\nReadings change every ten minutes, so cache them for 600 seconds and never longer. Temperatures are in °C with one decimal; wind is in km/h, except for Niseko, which still reports m/s and has to be converted.",
    example: { file: "load-stations.ts", lang: "ts", code: stationExample },
    files: [
      { name: "station-api.md", size: "4.2 KB" },
      { name: "fixtures.json", size: "18 KB" },
    ],
    recent: ["slow-list", "feels-like", "snow-axis"],
  },
  {
    id: "wind-chill",
    name: "Wind chill and feels-like",
    description: "Formulas, edge cases and test fixtures for feels-like values.",
    scope: "forecast-web",
    uses: 31,
    active: true,
    whenToUse: ["A task touches feels-like or wind chill values", "A review mentions the calm or mild thresholds"],
    instructions:
      "Use the standard wind chill formula only below 10 °C and above 4.8 km/h; return the air temperature otherwise. Round the wind to a tenth before comparing it with `CALM_KMH`.\n\nThe Hakuba Happō-one fixture, −6.2 °C in a 28 km/h wind, must read −14 °C.",
    files: [{ name: "fixtures.json", size: "6 KB" }],
    recent: ["feels-like"],
  },
  {
    id: "bulletin-style",
    name: "Bulletin email style",
    description: "Tone, length and the night palette rules for the morning bulletin.",
    scope: "bulletin-mailer",
    uses: 12,
    active: true,
    whenToUse: ["A task changes the bulletin template or its copy", "Someone reports the email is hard to read"],
    instructions:
      "Write plainly and keep each station to one line. Every colour comes from `palette.ts`; never set a background on a table cell. Check the avalanche warning in light and night before sending.",
    files: [{ name: "style-guide.md", size: "3.1 KB" }],
    recent: ["bulletin"],
  },
  {
    id: "a11y-review",
    name: "Accessibility review",
    description: "Contrast and colour-blind checks for maps and legends.",
    scope: "workspace",
    uses: 9,
    active: true,
    whenToUse: ["A change adds or recolours a legend, map layer or chart", "Before a release"],
    instructions:
      "Check text contrast against WCAG AA. For every legend, simulate deuteranopia and protanopia and make sure no two levels depend on colour alone.",
    files: [{ name: "checklist.md", size: "2.4 KB" }],
    recent: ["legend"],
  },
  {
    id: "release-notes",
    name: "Release notes",
    description: "Writes release notes from merged pull requests.",
    scope: "workspace",
    uses: 4,
    active: true,
    whenToUse: ["Someone asks what changed this week", "A release branch is cut"],
    instructions:
      "Group merged pull requests by project. Write one plain sentence per change, from the point of view of someone using the forecast app.",
    files: [],
    recent: [],
  },
  {
    id: "map-tiles",
    name: "Map tiles",
    description: "Projection and caching rules for radar-tiles.",
    scope: "radar-tiles",
    uses: 0,
    active: false,
    whenToUse: ["A task builds, caches or serves radar tiles"],
    instructions:
      "Tiles use Web Mercator at zoom 5 to 11. Keep the last six frames for an hour and mark saved frames as saved.",
    files: [{ name: "tile-grid.md", size: "1.8 KB" }],
    recent: ["radar-flicker", "offline-tiles"],
  },
];

export const suggestedSkills: Omit<Skill, "uses" | "active" | "recent">[] = [
  {
    id: "sql-migrations",
    name: "SQL migrations",
    description: "Writes reversible migrations and checks them against a copy of the station database.",
    scope: "workspace",
    whenToUse: ["A task changes the database schema"],
    instructions:
      "Write an up and a down migration. Run both against a copy of the station database before opening a pull request.",
    files: [],
  },
  {
    id: "browser-checks",
    name: "Browser checks",
    description: "Opens changed pages in a browser and compares them with the last release.",
    scope: "workspace",
    whenToUse: ["A change touches a page people see", "Before merging a visual change"],
    instructions: "Open every changed page at 390, 1024 and 1440 pixels wide and note anything that moved.",
    files: [],
  },
  {
    id: "translation-review",
    name: "Translation review",
    description: "Checks new strings in the Japanese and English bulletins read the same.",
    scope: "bulletin-mailer",
    whenToUse: ["A bulletin string is added or changed"],
    instructions: "Compare each new string with its translation and flag units or numbers that differ.",
    files: [],
  },
  {
    id: "changelog",
    name: "Changelog",
    description: "Keeps CHANGELOG.md up to date as pull requests merge.",
    scope: "workspace",
    whenToUse: ["A pull request merges into main"],
    instructions: "Add one line per merged pull request under the next version, newest first.",
    files: [],
  },
  {
    id: "performance-budget",
    name: "Performance budget",
    description: "Fails a change that makes the forecast page slower than 1.5 s on a slow phone.",
    scope: "forecast-web",
    whenToUse: ["A change adds a request, a font or a large image"],
    instructions: "Measure the forecast page on a throttled connection and compare it with the budget.",
    files: [],
  },
];

export function useSkills() {
  const [items, setItems] = useState(initialSkills);
  const [suggested, setSuggested] = useState(suggestedSkills);
  const seq = useRef(0);

  function toggle(id: string, active: boolean) {
    const target = items.find((s) => s.id === id);
    setItems((all) => all.map((s) => (s.id === id ? { ...s, active } : s)));
    if (target) toast(active ? `Turned on “${target.name}”` : `Turned off “${target.name}”`, { duration: 3000 });
  }

  function setScope(id: string, scope: SkillScope) {
    setItems((all) => all.map((s) => (s.id === id ? { ...s, scope } : s)));
  }

  function add(id: string) {
    const source = suggested.find((s) => s.id === id);
    if (!source) return;
    setSuggested((all) => all.filter((s) => s.id !== id));
    setItems((all) => [{ ...source, uses: 0, active: true, recent: [] }, ...all]);
  }

  function save(draft: SkillDraft, id?: string) {
    const fields = {
      name: draft.name,
      description: draft.description,
      scope: draft.scope,
      instructions: draft.instructions,
      files: draft.files,
      whenToUse: draft.when
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
    if (id) {
      setItems((all) => all.map((s) => (s.id === id ? { ...s, ...fields } : s)));
      return id;
    }
    const next = `skill-${++seq.current}`;
    setItems((all) => [{ ...fields, id: next, uses: 0, active: true, recent: [] }, ...all]);
    return next;
  }

  function remove(id: string) {
    setItems((all) => all.filter((s) => s.id !== id));
  }

  return useMemo(() => ({ items, suggested, toggle, setScope, add, save, remove }), [items, suggested]);
}

export type SkillStore = ReturnType<typeof useSkills>;

function scopeLabel(scope: SkillScope) {
  return scope === "workspace" ? "Workspace" : scope;
}

function usesLabel(uses: number) {
  return uses === 0 ? "Not used this week" : `Used ${uses} ${uses === 1 ? "time" : "times"} this week`;
}

function Prose({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-6 text-pretty text-foreground">
      {text.split("\n\n").map((para) => (
        <p key={para}>
          {para.split("`").map((part, i) =>
            i % 2 ? (
              <code key={i} className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.86em]">
                {part}
              </code>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function SkillRow({
  skill,
  highlight,
  onOpen,
  onToggle,
}: {
  skill: Skill;
  highlight: boolean;
  onOpen: () => void;
  onToggle: (on: boolean) => void;
}) {
  return (
    <div
      data-skill-row={skill.id}
      className={cn(
        "relative flex items-start gap-4 px-4 py-3.5 transition-colors duration-700 ease-settle",
        "has-[[data-row-link]:hover]:bg-accent/40",
        highlight ? "bg-brand-soft duration-150" : "bg-transparent",
      )}
    >
      <div className="min-w-0 flex-1">
        <button
          type="button"
          data-row-link=""
          onClick={onOpen}
          className="cursor-default text-start text-sm leading-5 font-medium text-foreground outline-none after:absolute after:inset-0 focus-visible:after:ring-[3px] focus-visible:after:ring-ring focus-visible:after:ring-inset"
        >
          {skill.name}
        </button>
        <p className="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground">{skill.description}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-muted-foreground">
          <span className={cn(skill.scope !== "workspace" && "font-mono text-xs")}>{scopeLabel(skill.scope)}</span>
          <MetaDot />
          <span className="tabular-nums">{usesLabel(skill.uses)}</span>
        </p>
      </div>
      <Switch
        size="sm"
        aria-label={`${skill.name}, ${skill.active ? "on" : "off"}`}
        isSelected={skill.active}
        onChange={onToggle}
        className="relative z-10 mt-0.5 shrink-0"
      />
    </div>
  );
}

const listMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
  transition: { height: { duration: 0.24, ease: EASE_OUT }, opacity: { duration: 0.18, delay: 0.04 } },
} as const;

export const SkillsList = memo(function SkillsList({
  store,
  highlight,
  onOpen,
  onNew,
  onAdded,
}: {
  store: SkillStore;
  highlight: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onAdded: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<string>("installed");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (tab !== "discover" || loaded) return;
    const id = window.setTimeout(() => setLoaded(true), 700);
    return () => window.clearTimeout(id);
  }, [tab, loaded]);

  function add(id: string) {
    const skill = store.suggested.find((s) => s.id === id);
    store.add(id);
    onAdded(id);
    if (skill) {
      toast.success(`Added “${skill.name}”`, {
        description: "It's on for the whole workspace.",
        duration: 4000,
        action: { label: "View", onPress: () => setTab("installed") },
      });
    }
  }

  return (
    <PageBody>
      <PageHeader
        title="Skills"
        description="Instructions and files the agent picks up when a task calls for them."
        actions={
          <Button iconStart={<Plus />} onPress={onNew}>
            New skill
          </Button>
        }
      />
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="mt-5 gap-4">
        <TabList aria-label="Skills">
          <Tab id="installed" count={store.items.length}>
            Installed
          </Tab>
          <Tab id="discover" count={loaded ? store.suggested.length : undefined}>
            Discover
          </Tab>
        </TabList>
        <TabPanel id="installed">
          {store.items.length === 0 ? (
            <EmptyState
              size="sm"
              bordered
              illustration="folder"
              title="No skills yet"
              description="Add one from Discover, or write your own."
            />
          ) : (
            <ul
              aria-label="Installed skills"
              className="overflow-clip rounded-xl border border-border bg-card shadow-xs"
            >
              <AnimatePresence initial={false}>
                {store.items.map((skill) => (
                  <motion.li
                    key={skill.id}
                    {...(reduce ? {} : listMotion)}
                    className="border-b border-border last:border-b-0"
                  >
                    <SkillRow
                      skill={skill}
                      highlight={highlight === skill.id}
                      onOpen={() => onOpen(skill.id)}
                      onToggle={(on) => store.toggle(skill.id, on)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </TabPanel>
        <TabPanel id="discover">
          {!loaded ? (
            <div
              aria-busy="true"
              aria-label="Loading suggestions"
              className="overflow-clip rounded-xl border border-border bg-card"
            >
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-4 border-b border-border px-4 py-4 last:border-b-0">
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-full max-w-md" />
                  </div>
                  <Skeleton className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : store.suggested.length === 0 ? (
            <EmptyState
              size="sm"
              bordered
              illustration="inbox"
              title="You've added every suggestion"
              description="New suggestions show up here when the team starts using new tools."
            />
          ) : (
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              aria-label="Suggested skills"
              className="overflow-clip rounded-xl border border-border bg-card shadow-xs"
            >
              <AnimatePresence initial={false}>
                {store.suggested.map((skill) => (
                  <motion.li
                    key={skill.id}
                    {...(reduce ? {} : listMotion)}
                    className="border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start gap-4 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-5 font-medium text-foreground">{skill.name}</p>
                        <p className="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground">
                          {skill.description}
                        </p>
                        <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                          <span className={cn(skill.scope !== "workspace" && "font-mono text-xs")}>
                            {skill.scope === "workspace" ? "For the whole workspace" : `For ${skill.scope}`}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        iconStart={<Plus />}
                        aria-label={`Add ${skill.name}`}
                        onPress={() => add(skill.id)}
                        className="h-7 shrink-0 rounded-md px-2.5 text-[13px]"
                      >
                        Add
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </TabPanel>
      </Tabs>
    </PageBody>
  );
});

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm leading-5 font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export const SkillDetail = memo(function SkillDetail({
  skill,
  store,
  chatTitle,
  onBack,
  onEdit,
  onDelete,
  onOpenChat,
}: {
  skill: Skill;
  store: SkillStore;
  chatTitle: (id: string) => { title: string; project: string } | null;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenChat: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [heavy, setHeavy] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setHeavy(true), 40);
    return () => window.clearTimeout(id);
  }, []);
  const recent = skill.recent.map((id) => ({ id, chat: chatTitle(id) })).filter((r) => r.chat);
  return (
    <PageBody className="@container">
      <PageHeader
        back={{ label: "Skills", onPress: onBack }}
        title={skill.name}
        description={skill.description}
        aside={
          <Switch
            aria-label={`${skill.name}, ${skill.active ? "on" : "off"}`}
            isSelected={skill.active}
            onChange={(on) => store.toggle(skill.id, on)}
            className="mt-1 shrink-0"
          />
        }
        actions={
          <>
            <Select
              aria-label="Scope"
              size="sm"
              value={skill.scope}
              onChange={(k) => {
                if (k == null) return;
                store.setScope(skill.id, String(k) as SkillScope);
                toast(`“${skill.name}” now applies to ${k === "workspace" ? "the whole workspace" : k}`, {
                  duration: 3000,
                });
              }}
              className="w-44"
            >
              {(["workspace", ...projectIds] as SkillScope[]).map((s) => (
                <SelectItem key={s} id={s}>
                  {scopeLabel(s)}
                </SelectItem>
              ))}
            </Select>
            <Button variant="secondary" size="sm" iconStart={<Pencil />} onPress={() => onEdit(skill.id)}>
              Edit
            </Button>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={`Delete ${skill.name}`}
              onPress={() => setConfirm(true)}
              className="text-muted-foreground data-[hovered]:text-destructive"
            >
              <Trash />
            </IconButton>
          </>
        }
      />
      <div className="mt-7 grid gap-x-10 gap-y-8 @3xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Instructions">
            <Prose text={skill.instructions} />
            {skill.example && !heavy && <Skeleton className="mt-1 h-[9.5rem] rounded-xl" />}
            {skill.example && heavy && (
              <CodeBlock
                filename={skill.example.file}
                language={skill.example.lang}
                code={skill.example.code}
                className="not-fumadocs-codeblock mt-1"
              />
            )}
          </Block>
          <Block title="When to use">
            {skill.whenToUse.length === 0 ? (
              <p className="text-sm text-muted-foreground">Whenever a task mentions it by name.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm leading-6 text-foreground">
                {skill.whenToUse.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-[11px] size-1 shrink-0 rounded-full bg-muted-foreground" />
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
        <div className="flex flex-col gap-8 @3xl:border-s @3xl:border-border @3xl:ps-6">
          <Block title="Files">
            {skill.files.length === 0 ? (
              <p className="text-[13px] leading-5 text-muted-foreground">
                No files. The instructions are all it needs.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {skill.files.map((f) => (
                  <li key={f.name} className="flex items-start gap-2.5">
                    <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-mono text-[13px] leading-5 break-all text-foreground">{f.name}</span>
                      <span className="text-xs leading-4 text-muted-foreground tabular-nums">{f.size}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Block>
          <Block title="Recent use">
            {recent.length === 0 ? (
              <p className="text-[13px] leading-5 text-muted-foreground">No chats have used it yet.</p>
            ) : (
              <ul className="-mx-2 flex flex-col">
                {recent.map(({ id, chat }) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => onOpenChat(id)}
                      className="flex w-full cursor-default items-start gap-2.5 rounded-lg px-2 py-1.5 text-start outline-none transition-colors duration-150 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      <MessageCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[13px] leading-5 text-foreground">{chat?.title}</span>
                        <span className="font-mono text-xs leading-4 text-muted-foreground">{chat?.project}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </div>
      <AlertDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={`Delete “${skill.name}”?`}
        actionLabel="Delete skill"
        tone="destructive"
        icon={<Trash />}
        onAction={() => onDelete(skill.id)}
      >
        The agent stops using it in every project. Chats that used it keep their replies.
      </AlertDialog>
    </PageBody>
  );
});

function draftOf(skill?: Skill): SkillDraft {
  return skill
    ? {
        name: skill.name,
        description: skill.description,
        scope: skill.scope,
        instructions: skill.instructions,
        files: skill.files,
        when: skill.whenToUse.join("\n"),
      }
    : { name: "", description: "", scope: "workspace", instructions: "", files: [], when: "" };
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`;
}

export function SkillSheet({
  open,
  skill,
  onClose,
  onSave,
}: {
  open: boolean;
  skill?: Skill;
  onClose: () => void;
  onSave: (draft: SkillDraft) => void;
}) {
  const [initial, setInitial] = useState(() => draftOf(skill));
  const [draft, setDraft] = useState(initial);
  const [added, setAdded] = useState<SkillFile[]>([]);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const key = open ? (skill?.id ?? "new") : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key) {
      const fresh = draftOf(skill);
      setInitial(fresh);
      setDraft(fresh);
      setAdded([]);
      setTried(false);
    }
  }
  const set = <K extends keyof SkillDraft>(k: K, v: SkillDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const nameMissing = !draft.name.trim();
  const textMissing = !draft.instructions.trim();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || added.length > 0;

  function requestClose() {
    if (dirty) setConfirm(true);
    else onClose();
  }

  function submit() {
    setTried(true);
    if (nameMissing || textMissing) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      instructions: draft.instructions.trim(),
      files: [...draft.files, ...added],
    });
  }

  return (
    <>
      <Drawer
        isOpen={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
        aria-label={skill ? "Edit skill" : "New skill"}
        className="w-[30rem]"
      >
        <form
          ref={form}
          className="contents"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <DrawerHeader>
            <DrawerTitle>{skill ? "Edit skill" : "New skill"}</DrawerTitle>
            <p className="text-[13px] leading-5 text-muted-foreground">
              The agent reads it when a task matches what you write under When to use.
            </p>
          </DrawerHeader>
          <DrawerBody className="flex flex-col gap-5 py-3">
            <TextField
              label="Name"
              value={draft.name}
              onChange={(v) => set("name", v)}
              isRequired
              isInvalid={tried && nameMissing}
              errorMessage="Give the skill a name."
              placeholder="Station data"
              autoFocus
              validationBehavior="aria"
            />
            <TextField
              label="Description"
              value={draft.description}
              onChange={(v) => set("description", v)}
              placeholder="How to read and cache readings from the station API"
            />
            <TextArea
              label="When to use"
              description="One situation per line."
              value={draft.when}
              onChange={(v) => set("when", v)}
              placeholder="A task reads or shows station readings"
              minRows={3}
              maxRows={6}
              autoGrow
            />
            <TextArea
              label="Instructions"
              value={draft.instructions}
              onChange={(v) => set("instructions", v)}
              isRequired
              isInvalid={tried && textMissing}
              errorMessage="Write what the agent should know or do."
              placeholder="Readings come from /api/stations. Cache them for ten minutes."
              minRows={6}
              maxRows={14}
              autoGrow
              validationBehavior="aria"
              className="[&_textarea]:font-mono [&_textarea]:text-[13px] [&_textarea]:leading-5"
            />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Files</p>
              {draft.files.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {draft.files.map((f) => (
                    <li key={f.name} className="flex items-center gap-2.5 rounded-lg bg-muted/70 px-3 py-2">
                      <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-mono text-[13px] leading-5">{f.name}</span>
                        <span className="text-xs leading-4 text-muted-foreground">{f.size}</span>
                      </span>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${f.name}`}
                        onPress={() =>
                          set(
                            "files",
                            draft.files.filter((x) => x.name !== f.name),
                          )
                        }
                        className="size-7 text-muted-foreground data-[hovered]:text-foreground"
                      >
                        <Trash />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
              <FileDropzone
                label="Drop reference files here"
                hint="Markdown, JSON or text, up to 1 MB each"
                maxSize={1024 * 1024}
                onChange={(list) => setAdded(list.map((f) => ({ name: f.name, size: formatSize(f.size) })))}
              />
            </div>
            <Select
              label="Scope"
              value={draft.scope}
              onChange={(k) => k != null && set("scope", String(k) as SkillScope)}
            >
              {(["workspace", ...projectIds] as SkillScope[]).map((s) => (
                <SelectItem key={s} id={s} description={s === "workspace" ? "Every project" : undefined}>
                  {scopeLabel(s)}
                </SelectItem>
              ))}
            </Select>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" onPress={requestClose}>
              Cancel
            </Button>
            <Button type="submit">{skill ? "Save changes" : "Create skill"}</Button>
          </DrawerFooter>
        </form>
      </Drawer>
      <AlertDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title="Discard your changes?"
        actionLabel="Discard"
        cancelLabel="Keep editing"
        tone="destructive"
        onAction={onClose}
      >
        {skill ? `Your edits to “${skill.name}” will be lost.` : "This skill has not been saved yet."}
      </AlertDialog>
    </>
  );
}

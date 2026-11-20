"use client";

import { Bell, Bot, ChevronRight, Cpu, Gauge, Layers, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { memo, type ReactNode, useId, useState } from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { Checkbox } from "@/components/miyuki-ui/checkbox";
import {
  applyTheme,
  EASE_OUT,
  type ModeId,
  ModelPicker,
  modes,
  PageBody,
  PageHeader,
  type ProjectId,
  projectIds,
  type ReasoningMode,
  SavedNote,
  type Theme,
  themeNames,
  themeOrder,
  useFlash,
  useSettings,
  useTheme,
} from "@/components/miyuki-ui/coding-assistant-shared";
import { PlanLimitList } from "@/components/miyuki-ui/context-meter";
import { ProgressBar } from "@/components/miyuki-ui/progress";
import { Radio, RadioGroup } from "@/components/miyuki-ui/radio";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { Slider } from "@/components/miyuki-ui/slider";
import { Switch } from "@/components/miyuki-ui/switch";
import { TagInput } from "@/components/miyuki-ui/tag-input";
import { TextArea } from "@/components/miyuki-ui/textarea";
import { toast } from "@/components/miyuki-ui/toast";
import { cn } from "@/lib/utils";

export type SettingsSectionId = "general" | "agent" | "models" | "context" | "notifications" | "usage";

export const settingsSections: { id: SettingsSectionId; name: string; description: string; icon: ReactNode }[] = [
  { id: "general", name: "General", description: "Theme, language and how messages send", icon: <SlidersHorizontal /> },
  { id: "agent", name: "Agent", description: "Default mode, permissions and reasoning", icon: <Bot /> },
  { id: "models", name: "Models", description: "The model and effort new chats start with", icon: <Cpu /> },
  { id: "context", name: "Context", description: "Automatic compaction and project notes", icon: <Layers /> },
  { id: "notifications", name: "Notifications", description: "Desktop and email alerts", icon: <Bell /> },
  { id: "usage", name: "Usage", description: "Plan limits and usage by project", icon: <Gauge /> },
];

export function sectionName(id: string) {
  return settingsSections.find((s) => s.id === id)?.name ?? "Settings";
}

const previews: Record<Theme, { bg: string; card: string; fg: string; muted: string; brand: string; border: string }> =
  {
    light: {
      bg: "oklch(0.984 0.005 236)",
      card: "oklch(1 0 0)",
      fg: "oklch(0.245 0.035 248)",
      muted: "oklch(0.93 0.01 236)",
      brand: "oklch(0.55 0.13 240)",
      border: "oklch(0.915 0.012 236)",
    },
    dark: {
      bg: "oklch(0.175 0.024 248)",
      card: "oklch(0.21 0.027 248)",
      fg: "oklch(0.95 0.008 236)",
      muted: "oklch(0.3 0.03 248)",
      brand: "oklch(0.74 0.12 230)",
      border: "oklch(0.3 0.03 248)",
    },
    ink: {
      bg: "oklch(0.175 0 0)",
      card: "oklch(0.205 0 0)",
      fg: "oklch(0.965 0 0)",
      muted: "oklch(0.3 0 0)",
      brand: "oklch(0.93 0 0)",
      border: "oklch(0.285 0 0)",
    },
  };

function ThemePreview({ theme }: { theme: Theme }) {
  const c = previews[theme];
  return (
    <span
      aria-hidden="true"
      className="flex aspect-[16/9] w-full gap-1.5 overflow-hidden rounded-lg p-1.5"
      style={{ backgroundColor: c.bg, boxShadow: `inset 0 0 0 1px ${c.border}` }}
    >
      <span className="flex w-1/3 flex-col gap-1 rounded-[5px] p-1.5" style={{ backgroundColor: c.card }}>
        <span className="h-1 w-3/4 rounded-full" style={{ backgroundColor: c.muted }} />
        <span className="h-1.5 w-full rounded-[3px]" style={{ backgroundColor: c.brand, opacity: 0.35 }} />
        <span className="h-1 w-2/3 rounded-full" style={{ backgroundColor: c.muted }} />
        <span className="h-1 w-1/2 rounded-full" style={{ backgroundColor: c.muted }} />
      </span>
      <span className="flex flex-1 flex-col gap-1 py-1.5">
        <span className="h-1 w-1/2 rounded-full" style={{ backgroundColor: c.fg, opacity: 0.7 }} />
        <span className="h-1 w-5/6 rounded-full" style={{ backgroundColor: c.fg, opacity: 0.3 }} />
        <span className="h-1 w-2/3 rounded-full" style={{ backgroundColor: c.fg, opacity: 0.3 }} />
        <span
          className="mt-auto h-3 w-full rounded-[4px]"
          style={{ backgroundColor: c.card, boxShadow: `inset 0 0 0 1px ${c.border}` }}
        />
      </span>
    </span>
  );
}

function Row({
  title,
  description,
  saved,
  children,
  wide = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  saved?: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-5 first:pt-0",
        !wide && "@xl:flex-row @xl:items-start @xl:justify-between @xl:gap-8",
      )}
    >
      <div className={cn("min-w-0", !wide && "@xl:max-w-[20rem]")}>
        <p className="flex flex-wrap items-center gap-x-2 text-sm leading-5 font-medium text-foreground">
          {title}
          <SavedNote show={Boolean(saved)} />
        </p>
        {description != null && (
          <p className="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn("min-w-0", !wide && "@xl:w-64 @xl:shrink-0")}>{children}</div>
    </div>
  );
}

const usageByProject: { project: ProjectId; share: number; runs: number }[] = [
  { project: "forecast-web", share: 41, runs: 186 },
  { project: "bulletin-mailer", share: 9, runs: 38 },
  { project: "harbour-feed", share: 7, runs: 412 },
  { project: "radar-tiles", share: 5, runs: 24 },
];

const languages = [
  { id: "en", name: "English" },
  { id: "ja", name: "日本語" },
  { id: "zh", name: "简体中文" },
  { id: "de", name: "Deutsch" },
  { id: "fr", name: "Français" },
];

const reasoningText: Record<ReasoningMode, string> = {
  off: "Replies show “Working” while the agent thinks, and no reasoning afterwards.",
  summary: "Each reply shows the titles of its reasoning steps.",
  full: "Each reply shows every reasoning step in full, as it streams.",
};

function SectionContent({ section }: { section: SettingsSectionId }) {
  const { settings, update } = useSettings();
  const theme = useTheme();
  const [saved, flash] = useFlash();
  const [notesFor, setNotesFor] = useState<ProjectId>("forecast-web");
  const change = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K], note: string = key) => {
    update(key, value);
    flash(note);
  };

  if (section === "general") {
    return (
      <div className="@container flex flex-col divide-y divide-border">
        <Row title="Theme" description="Matches the switch in the sidebar." saved={saved === "theme"} wide>
          <AriaRadioGroup
            aria-label="Theme"
            value={theme ?? "light"}
            onChange={(value) => {
              applyTheme(value as Theme);
              flash("theme");
            }}
            className="grid max-w-xl grid-cols-3 gap-3"
          >
            {themeOrder.map((id) => (
              <AriaRadio
                key={id}
                value={id}
                aria-label={themeNames[id]}
                className={({ isSelected, isFocusVisible, isHovered }) =>
                  cn(
                    "flex cursor-default flex-col gap-2 rounded-xl p-1.5 outline-none select-none",
                    "transition-[box-shadow,background-color] duration-150 ease-settle",
                    isSelected ? "bg-brand-soft/60 ring-2 ring-brand" : "ring-1 ring-border",
                    !isSelected && isHovered && "ring-border-strong",
                    isFocusVisible && "ring-[3px] ring-ring",
                  )
                }
              >
                {({ isSelected }) => (
                  <>
                    <ThemePreview theme={id} />
                    <span
                      className={cn(
                        "px-1 pb-0.5 text-[13px] leading-5 font-medium",
                        isSelected ? "text-brand-strong" : "text-foreground",
                      )}
                    >
                      {themeNames[id]}
                    </span>
                  </>
                )}
              </AriaRadio>
            ))}
          </AriaRadioGroup>
        </Row>
        <Row title="Language" description="Demo only. The interface stays in English." saved={saved === "language"}>
          <Select
            aria-label="Language"
            value={settings.language}
            onChange={(k) => k != null && change("language", String(k))}
          >
            {languages.map((l) => (
              <SelectItem key={l.id} id={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </Select>
        </Row>
        <Row
          title="Send messages with"
          description="How the composer sends what you type."
          saved={saved === "sendWith"}
        >
          <RadioGroup
            aria-label="Send messages with"
            value={settings.sendWith}
            onChange={(value) => change("sendWith", value as "enter" | "mod-enter")}
          >
            <Radio value="enter" description="Shift Enter adds a new line.">
              Enter
            </Radio>
            <Radio value="mod-enter" description="Enter adds a new line, which suits long messages.">
              ⌘ Enter
            </Radio>
          </RadioGroup>
        </Row>
      </div>
    );
  }

  if (section === "agent") {
    return (
      <div className="@container flex flex-col divide-y divide-border">
        <Row title="Default mode" description="New chats start in this mode." saved={saved === "defaultMode"}>
          <RadioGroup
            aria-label="Default mode"
            value={settings.defaultMode}
            onChange={(v) => change("defaultMode", v as ModeId)}
          >
            {modes.map((m) => (
              <Radio key={m.id} value={m.id} description={m.description}>
                {m.name}
              </Radio>
            ))}
          </RadioGroup>
        </Row>
        <Row
          title="Ask before running commands"
          description="Commands outside the allowed list wait for your yes."
          saved={saved === "askCommands"}
        >
          <Switch
            aria-label="Ask before running commands"
            isSelected={settings.askCommands}
            onChange={(v) => change("askCommands", v)}
          />
        </Row>
        <Row
          title="Ask before editing files outside the chat's folder"
          description="Keeps a chat about src/stations from touching the bulletin templates."
          saved={saved === "askOutside"}
        >
          <Switch
            aria-label="Ask before editing files outside the chat's folder"
            isSelected={settings.askOutside}
            onChange={(v) => change("askOutside", v)}
          />
        </Row>
        <Row
          title="Allowed commands"
          description="These run without asking. Press Enter to add one."
          saved={saved === "allowedCommands"}
          wide
        >
          <TagInput
            aria-label="Allowed commands"
            value={settings.allowedCommands}
            onChange={(tags) => change("allowedCommands", tags)}
            placeholder="Add a command"
            suggestions={["pnpm build", "pnpm typecheck", "git diff", "git log"]}
            className="max-w-xl [&_[data-tag]]:font-mono"
          />
        </Row>
        <Row title="Show reasoning" description={reasoningText[settings.reasoning]} saved={saved === "reasoning"}>
          <SegmentedControl
            aria-label="Show reasoning"
            size="sm"
            fullWidth
            selectedKeys={[settings.reasoning]}
            onSelectionChange={(keys) => {
              const [k] = [...keys];
              if (k != null) change("reasoning", String(k) as ReasoningMode);
            }}
          >
            <Segment id="off">Off</Segment>
            <Segment id="summary">Summary</Segment>
            <Segment id="full">Full</Segment>
          </SegmentedControl>
        </Row>
        <Row
          title="Keep reasoning open after the reply"
          description="Otherwise it folds to one line once the agent is done."
          saved={saved === "keepReasoningOpen"}
        >
          <Switch
            aria-label="Keep reasoning open after the reply"
            isSelected={settings.keepReasoningOpen}
            isDisabled={settings.reasoning === "off"}
            onChange={(v) => change("keepReasoningOpen", v)}
          />
        </Row>
      </div>
    );
  }

  if (section === "models") {
    return (
      <div className="@container flex flex-col divide-y divide-border">
        <Row
          title="Default model and effort"
          description="New chats and new automations start with these. You can change them per message."
          saved={saved === "model"}
        >
          <ModelPicker
            model={settings.defaultModel}
            onModel={(m) => change("defaultModel", m, "model")}
            effort={settings.defaultEffort}
            onEffort={(e) => change("defaultEffort", e, "model")}
            placement="bottom start"
            showEffort
            triggerClassName="h-9 w-full justify-between rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs data-[hovered]:border-border-strong data-[hovered]:bg-card"
          />
        </Row>
      </div>
    );
  }

  if (section === "context") {
    return (
      <div className="@container flex flex-col divide-y divide-border">
        <Row
          title="Compact automatically"
          description="When a run pushes a chat past the threshold, older turns are summarised to free space."
          saved={saved === "autoCompact"}
        >
          <Switch
            aria-label="Compact automatically"
            isSelected={settings.autoCompact}
            onChange={(v) => change("autoCompact", v)}
          />
        </Row>
        <Row
          title="Compact at"
          description={`Context use that starts a compaction. Now ${settings.compactAt}%.`}
          saved={saved === "compactAt"}
        >
          <div className="flex flex-col gap-1.5">
            <Slider
              aria-label="Compact at"
              size="sm"
              showValue={false}
              minValue={70}
              maxValue={95}
              step={5}
              marks={[70, 75, 80, 85, 90, 95]}
              value={settings.compactAt}
              isDisabled={!settings.autoCompact}
              onChange={(v) => change("compactAt", Array.isArray(v) ? v[0] : v)}
              formatOptions={{ style: "unit", unit: "percent" }}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>70%</span>
              <span>95%</span>
            </div>
          </div>
        </Row>
        <Row
          title="Project notes"
          description="Read at the start of every chat in the project."
          saved={saved === "notes"}
          wide
        >
          <div className="flex max-w-xl flex-col gap-3">
            <Select
              aria-label="Project"
              value={notesFor}
              onChange={(k) => k != null && setNotesFor(String(k) as ProjectId)}
              className="w-56"
            >
              {projectIds.map((p) => (
                <SelectItem key={p} id={p}>
                  {p}
                </SelectItem>
              ))}
            </Select>
            <TextArea
              aria-label={`Notes for ${notesFor}`}
              value={settings.notes[notesFor]}
              onChange={(v) => change("notes", { ...settings.notes, [notesFor]: v })}
              placeholder={`Anything the agent should know about ${notesFor}`}
              minRows={4}
              maxRows={10}
              autoGrow
            />
          </div>
        </Row>
      </div>
    );
  }

  if (section === "notifications") {
    const pair = (
      title: string,
      description: string,
      desktop: "runDesktop" | "failDesktop",
      email: "runEmail" | "failEmail",
    ) => (
      <Row title={title} description={description} saved={saved === desktop}>
        <div className="flex gap-6">
          <Checkbox isSelected={settings[desktop]} onChange={(v) => change(desktop, v, desktop)}>
            Desktop
          </Checkbox>
          <Checkbox isSelected={settings[email]} onChange={(v) => change(email, v, desktop)}>
            Email
          </Checkbox>
        </div>
      </Row>
    );
    return (
      <div className="@container flex flex-col divide-y divide-border">
        {pair("When a run finishes", "A chat's plan is done and the reply is ready.", "runDesktop", "runEmail")}
        {pair("When an automation fails", "Includes the reason and a link to retry.", "failDesktop", "failEmail")}
        <Row
          title="Weekly summary"
          description="Every Monday at 09:00: runs, changes and usage across the workspace."
          saved={saved === "weekly"}
        >
          <Switch aria-label="Weekly summary" isSelected={settings.weekly} onChange={(v) => change("weekly", v)} />
        </Row>
      </div>
    );
  }

  return (
    <div className="@container flex flex-col divide-y divide-border">
      <Row title="Team plan" description="14 seats for Hoshizora Weather. Renews on 1 March." wide>
        <div className="flex max-w-xl flex-col gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-1 shadow-xs">
            <PlanLimitList
              limits={[
                { label: "This session", resetsIn: "in 3 h 12 min", value: 34 },
                { label: "This week", resetsIn: "on Monday at 09:00", value: 62 },
              ]}
              className="[&>li]:py-3 [&>li:last-child]:pb-3"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onPress={() =>
              toast("Upgrade requested", {
                description: "The new price is emailed to the workspace owner before anything changes.",
                duration: 4000,
              })
            }
            className="self-start"
          >
            Upgrade plan
          </Button>
        </div>
      </Row>
      <Row title="Usage by project" description="Share of this week's usage." wide>
        <ul className="flex max-w-xl flex-col gap-4">
          {usageByProject.map((u) => (
            <li key={u.project} className="flex flex-col gap-1.5">
              <div className="flex items-end justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-mono text-[13px] leading-5 text-foreground">{u.project}</span>
                  <span className="text-xs leading-4 text-muted-foreground tabular-nums">{u.runs} runs this week</span>
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{u.share}%</span>
              </div>
              <ProgressBar size="sm" value={u.share} showValue={false} aria-label={`${u.project} usage`} />
            </li>
          ))}
        </ul>
      </Row>
    </div>
  );
}

function SectionTitle({ section }: { section: SettingsSectionId }) {
  const info = settingsSections.find((s) => s.id === section) ?? settingsSections[0];
  return (
    <div className="mb-5">
      <h2 className="text-base leading-6 font-semibold tracking-[-0.01em] text-foreground">{info.name}</h2>
      <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{info.description}.</p>
    </div>
  );
}

export const SettingsPage = memo(function SettingsPage({
  mode,
  section,
  onSection,
  onBack,
}: {
  mode: "both" | "list" | "section";
  section: SettingsSectionId;
  onSection: (id: SettingsSectionId) => void;
  onBack?: () => void;
}) {
  const reduce = useReducedMotion();
  const highlight = useId();

  if (mode === "list") {
    return (
      <PageBody className="max-w-[40rem]">
        <PageHeader title="Settings" description="Changes apply at once." />
        <ul
          aria-label="Settings sections"
          className="mt-6 overflow-clip rounded-xl border border-border bg-card shadow-xs"
        >
          {settingsSections.map((s) => (
            <li key={s.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onSection(s.id)}
                className="flex w-full cursor-default items-center gap-3 px-4 py-3 text-start outline-none transition-colors duration-150 hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span aria-hidden="true" className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
                  {s.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm leading-5 font-medium text-foreground">{s.name}</span>
                  <span className="text-[13px] leading-5 text-muted-foreground">{s.description}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
              </button>
            </li>
          ))}
        </ul>
      </PageBody>
    );
  }

  if (mode === "section") {
    return (
      <PageBody className="max-w-[40rem]">
        <PageHeader
          title={sectionName(section)}
          description={settingsSections.find((s) => s.id === section)?.description}
          back={onBack ? { label: "Settings", onPress: onBack } : undefined}
        />
        <div className="mt-6">
          <SectionContent section={section} />
        </div>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[60rem]">
      <PageHeader title="Settings" description="Changes apply at once." />
      <div className="mt-7 grid grid-cols-[11rem_minmax(0,1fr)] gap-10">
        <nav aria-label="Settings sections" className="sticky top-0 self-start">
          <LayoutGroup id={highlight}>
            <ul className="flex flex-col gap-0.5">
              {settingsSections.map((s) => {
                const current = s.id === section;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={current ? "page" : undefined}
                      onClick={() => onSection(s.id)}
                      className={cn(
                        "relative flex h-8 w-full cursor-default items-center gap-2.5 rounded-lg px-2.5 text-start text-sm font-medium outline-none select-none",
                        "transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring",
                        current ? "text-brand-strong" : "text-foreground hover:bg-accent/60",
                      )}
                    >
                      {current && (
                        <motion.span
                          layoutId={`${highlight}-pill`}
                          aria-hidden="true"
                          className="absolute inset-0 bg-brand-soft"
                          style={{ borderRadius: 8 }}
                          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative flex shrink-0 [&_svg]:size-4",
                          current ? "text-brand-strong" : "text-muted-foreground",
                        )}
                      >
                        {s.icon}
                      </span>
                      <span className="relative min-w-0 truncate">{s.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </LayoutGroup>
        </nav>
        <div className="grid min-w-0 grid-cols-1">
          <AnimatePresence initial={false}>
            <motion.div
              key={section}
              initial={{ opacity: 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.18, delay: 0.07, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              data-settings-section={section}
              className="col-start-1 row-start-1 min-w-0"
            >
              <SectionTitle section={section} />
              <SectionContent section={section} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageBody>
  );
});

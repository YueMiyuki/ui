"use client";

import {
  Bell,
  CalendarDays,
  CreditCard,
  Download,
  HardDriveDownload,
  KeyRound,
  MessageSquareText,
  Monitor,
  Moon,
  Palette,
  Plug,
  Settings2,
  Sun,
  Webhook,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useId, useState } from "react";
import type { Key } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { TextField } from "@/components/miyuki-ui/input";
import { Meter } from "@/components/miyuki-ui/meter";
import { Modal, type ModalProps, ModalTitle } from "@/components/miyuki-ui/modal";
import { Segment, SegmentedControl } from "@/components/miyuki-ui/segmented-control";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { Switch } from "@/components/miyuki-ui/switch";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { cn } from "@/lib/utils";

export type SettingsSection = "general" | "appearance" | "notifications" | "plan" | "integrations";

export interface SettingsValues {
  workspaceName: string;
  language: string;
  timeZone: string;
  units: "metric" | "imperial";
  theme: "light" | "dark" | "system";
  mapStyle: string;
  compact: boolean;
  clock24: boolean;
  reduceMotion: boolean;
  avalancheBulletins: boolean;
  stormWarnings: boolean;
  mentions: boolean;
  morningSummary: string;
  weeklyReport: boolean;
  integrations: Record<string, boolean>;
}

export interface SettingsPlan {
  name: string;
  price: string;
  interval: string;
  renews: string;
  usageLabel: string;
  usage: number;
  limit: number;
  resets?: string;
  billingEmail?: string;
  paymentMethod?: string;
  invoices?: string;
  image?: string;
}

const sections: { id: SettingsSection; label: string; icon: ReactNode; description: string }[] = [
  { id: "general", label: "General", icon: <Settings2 />, description: "Workspace name, language and units." },
  { id: "appearance", label: "Appearance", icon: <Palette />, description: "How the app looks on this device." },
  { id: "notifications", label: "Notifications", icon: <Bell />, description: "What reaches you, and when." },
  { id: "plan", label: "Plan", icon: <CreditCard />, description: "Your subscription, usage and invoices." },
  {
    id: "integrations",
    label: "Integrations",
    icon: <Plug />,
    description: "Send forecasts and alerts to other tools.",
  },
];

const integrations: { id: string; name: string; description: string; icon: ReactNode }[] = [
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Post every bulletin to your own endpoint as JSON.",
    icon: <Webhook />,
  },
  {
    id: "calendar",
    name: "Calendar feed",
    description: "Storm windows as events in any calendar app.",
    icon: <CalendarDays />,
  },
  {
    id: "sms",
    name: "Text alerts",
    description: "Send red warnings to on-call staff by SMS.",
    icon: <MessageSquareText />,
  },
  {
    id: "export",
    name: "Station export",
    description: "Hourly readings as CSV, delivered to your storage.",
    icon: <HardDriveDownload />,
  },
];

const defaultValues: SettingsValues = {
  workspaceName: "Hoshizora Weather",
  language: "en",
  timeZone: "tokyo",
  units: "metric",
  theme: "system",
  mapStyle: "terrain",
  compact: false,
  clock24: true,
  reduceMotion: false,
  avalancheBulletins: true,
  stormWarnings: true,
  mentions: true,
  morningSummary: "0600",
  weeklyReport: false,
  integrations: { webhooks: true, sms: true },
};

const defaultPlan: SettingsPlan = {
  name: "Ridge",
  price: "¥4,800",
  interval: "per month",
  renews: "Renews on 1 March 2027",
  usageLabel: "Forecast API calls",
  usage: 18_420,
  limit: 25_000,
  resets: "Resets in 16 days",
  billingEmail: "accounts@hoshizora.example",
  paymentMethod: "Card ending 4821, expires 08/29",
  invoices: "12 invoices since March 2026",
};

const count = new Intl.NumberFormat("en-US");

interface RowProps {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children: (ids: RowIds) => ReactNode;
}

function Row({ label, description, icon, children }: RowProps) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4">
      <div className="flex min-w-[160px] flex-1 items-start gap-3">
        {icon != null && (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-xs [&_svg]:size-4"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p id={`${id}-label`} className="text-sm leading-5 font-medium text-foreground">
            {label}
          </p>
          {description != null && (
            <p id={`${id}-description`} className="mt-0.5 text-[13px] leading-5 text-pretty text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {children({
          "aria-labelledby": `${id}-label`,
          "aria-describedby": description != null ? `${id}-description` : undefined,
        })}
      </div>
    </div>
  );
}

type RowIds = { "aria-labelledby": string; "aria-describedby"?: string };

const describe = (ids: RowIds) => ({ "aria-describedby": ids["aria-labelledby"] });

function Rows({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border">{children}</div>;
}

const ease = (direction: string, from: number) =>
  `linear-gradient(${direction}, black ${from}%, rgb(0 0 0 / 0.72) ${from + (100 - from) * 0.3}%, rgb(0 0 0 / 0.36) ${from + (100 - from) * 0.55}%, rgb(0 0 0 / 0.12) ${from + (100 - from) * 0.78}%, rgb(0 0 0 / 0.03) ${from + (100 - from) * 0.92}%, transparent)`;

const cornerMask = `${ease("to left", 22)}, ${ease("to bottom", 30)}`;

const cornerStyle: CSSProperties = {
  maskImage: cornerMask,
  WebkitMaskImage: cornerMask,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

function PlanCard({ plan, onUpgrade }: { plan: SettingsPlan; onUpgrade?: () => void }) {
  const usageId = useId();
  return (
    <div className="relative overflow-clip rounded-xl border border-border bg-card shadow-xs">
      {plan.image != null && (
        <img
          src={plan.image}
          alt=""
          draggable={false}
          style={cornerStyle}
          className="pointer-events-none absolute end-0 top-0 h-[76%] w-[62%] object-cover rtl:-scale-x-100"
        />
      )}
      <div className="relative p-5">
        <p className="text-[13px] leading-5 text-muted-foreground">Current plan</p>
        <p className="mt-0.5 font-display text-xl leading-7 font-semibold tracking-[-0.01em] text-foreground">
          {plan.name}
        </p>
        <p className="mt-4 flex items-baseline gap-1.5">
          <span className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-foreground tabular-nums">
            {plan.price}
          </span>
          <span className="text-sm text-muted-foreground">{plan.interval}</span>
        </p>
        <p className="text-[13px] leading-5 text-muted-foreground">{plan.renews}</p>
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span id={usageId} className="text-sm leading-5 font-medium text-foreground">
            {plan.usageLabel}
          </span>
          <span className="text-sm leading-5 text-muted-foreground tabular-nums">
            {count.format(plan.usage)} of {count.format(plan.limit)}
          </span>
        </div>
        <Meter
          className="mt-1.5"
          aria-labelledby={usageId}
          showValue={false}
          value={plan.usage}
          maxValue={plan.limit}
          valueLabel={`${count.format(plan.usage)} of ${count.format(plan.limit)}`}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {plan.resets != null ? (
            <p className="text-[13px] leading-5 text-muted-foreground">{plan.resets}</p>
          ) : (
            <span />
          )}
          <Button size="sm" onPress={onUpgrade}>
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface SettingsDialogProps extends Omit<ModalProps, "children" | "size"> {
  section?: SettingsSection;
  defaultSection?: SettingsSection;
  onSectionChange?: (section: SettingsSection) => void;
  defaultSettings?: Partial<SettingsValues>;
  onSettingChange?: <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => void;
  plan?: Partial<SettingsPlan>;
  onUpgrade?: () => void;
  onExport?: () => void;
}

export function SettingsDialog({
  section,
  defaultSection = "general",
  onSectionChange,
  defaultSettings,
  onSettingChange,
  plan,
  onUpgrade,
  onExport,
  className,
  ...props
}: SettingsDialogProps) {
  const [ownSection, setOwnSection] = useState<SettingsSection>(defaultSection);
  const current = section ?? ownSection;
  const [values, setValues] = useState<SettingsValues>(() => ({ ...defaultValues, ...defaultSettings }));
  const fullPlan = { ...defaultPlan, ...plan };

  function select(key: Key) {
    const next = key as SettingsSection;
    if (section === undefined) setOwnSection(next);
    onSectionChange?.(next);
  }

  function set<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    onSettingChange?.(key, value);
  }

  function connect(id: string, on: boolean) {
    set("integrations", { ...values.integrations, [id]: on });
  }

  const content: Record<SettingsSection, ReactNode> = {
    general: (
      <Rows>
        <Row label="Workspace name" description="Shown on bulletins and in invitations.">
          {(ids) => (
            <TextField
              {...ids}
              value={values.workspaceName}
              onChange={(v) => set("workspaceName", v)}
              className="w-48"
            />
          )}
        </Row>
        <Row label="Language" description="Used for the app and for emails.">
          {(ids) => (
            <Select
              {...ids}
              selectedKey={values.language}
              onSelectionChange={(k) => set("language", String(k))}
              className="w-48"
            >
              <SelectItem id="en">English</SelectItem>
              <SelectItem id="ja">日本語</SelectItem>
              <SelectItem id="nb">Norsk bokmål</SelectItem>
            </Select>
          )}
        </Row>
        <Row label="Time zone" description="Bulletin times are written in this zone.">
          {(ids) => (
            <Select
              {...ids}
              selectedKey={values.timeZone}
              onSelectionChange={(k) => set("timeZone", String(k))}
              className="w-48"
            >
              <SelectItem id="tokyo">Tokyo (GMT+9)</SelectItem>
              <SelectItem id="oslo">Oslo (GMT+1)</SelectItem>
              <SelectItem id="utc">Coordinated Universal Time</SelectItem>
            </Select>
          )}
        </Row>
        <Row label="Units" description="For snow depth, temperature and wind.">
          {(ids) => (
            <SegmentedControl
              {...ids}
              size="sm"
              selectedKeys={[values.units]}
              onSelectionChange={(keys) => {
                const [k] = [...keys];
                if (k) set("units", k as SettingsValues["units"]);
              }}
            >
              <Segment id="metric">Metric</Segment>
              <Segment id="imperial">Imperial</Segment>
            </SegmentedControl>
          )}
        </Row>
        <Row label="Export workspace" description="Stations, forecasts and bulletins as a ZIP file.">
          {(ids) => (
            <Button variant="secondary" size="sm" iconStart={<Download />} {...describe(ids)} onPress={onExport}>
              Export
            </Button>
          )}
        </Row>
      </Rows>
    ),
    appearance: (
      <Rows>
        <Row label="Theme" description="System follows your device.">
          {(ids) => (
            <SegmentedControl
              {...ids}
              size="sm"
              selectedKeys={[values.theme]}
              onSelectionChange={(keys) => {
                const [k] = [...keys];
                if (k) set("theme", k as SettingsValues["theme"]);
              }}
            >
              <Segment id="light">
                <Sun />
                Light
              </Segment>
              <Segment id="dark">
                <Moon />
                Dark
              </Segment>
              <Segment id="system">
                <Monitor />
                System
              </Segment>
            </SegmentedControl>
          )}
        </Row>
        <Row label="Map style" description="The base layer under forecasts.">
          {(ids) => (
            <Select
              {...ids}
              selectedKey={values.mapStyle}
              onSelectionChange={(k) => set("mapStyle", String(k))}
              className="w-40"
            >
              <SelectItem id="terrain">Terrain</SelectItem>
              <SelectItem id="contour">Contour lines</SelectItem>
              <SelectItem id="satellite">Satellite</SelectItem>
            </Select>
          )}
        </Row>
        <Row label="Compact lists" description="Fit more stations and bulletins on screen.">
          {(ids) => <Switch {...ids} isSelected={values.compact} onChange={(v) => set("compact", v)} />}
        </Row>
        <Row label="24-hour time" description="Write 18:30 rather than 6:30 pm.">
          {(ids) => <Switch {...ids} isSelected={values.clock24} onChange={(v) => set("clock24", v)} />}
        </Row>
        <Row label="Reduce motion" description="Stop radar loops and map fly-throughs.">
          {(ids) => <Switch {...ids} isSelected={values.reduceMotion} onChange={(v) => set("reduceMotion", v)} />}
        </Row>
      </Rows>
    ),
    notifications: (
      <Rows>
        <Row label="Avalanche bulletins" description="As soon as a region's danger level changes.">
          {(ids) => (
            <Switch {...ids} isSelected={values.avalancheBulletins} onChange={(v) => set("avalancheBulletins", v)} />
          )}
        </Row>
        <Row label="Storm warnings" description="Gusts above 25 m/s, or 30 cm of snow in a day.">
          {(ids) => <Switch {...ids} isSelected={values.stormWarnings} onChange={(v) => set("stormWarnings", v)} />}
        </Row>
        <Row label="Mentions and replies" description="When someone tags you in a forecast note.">
          {(ids) => <Switch {...ids} isSelected={values.mentions} onChange={(v) => set("mentions", v)} />}
        </Row>
        <Row label="Morning summary" description="One email with your saved regions.">
          {(ids) => (
            <Select
              {...ids}
              selectedKey={values.morningSummary}
              onSelectionChange={(k) => set("morningSummary", String(k))}
              className="w-32"
            >
              <SelectItem id="0500">05:00</SelectItem>
              <SelectItem id="0600">06:00</SelectItem>
              <SelectItem id="0700">07:00</SelectItem>
              <SelectItem id="off">Off</SelectItem>
            </Select>
          )}
        </Row>
        <Row label="Weekly station report" description="Uptime and data gaps, every Monday.">
          {(ids) => <Switch {...ids} isSelected={values.weeklyReport} onChange={(v) => set("weeklyReport", v)} />}
        </Row>
      </Rows>
    ),
    plan: (
      <>
        <PlanCard plan={fullPlan} onUpgrade={onUpgrade} />
        <div className="mt-2">
          <Rows>
            <Row label="Billing email" description={fullPlan.billingEmail}>
              {(ids) => (
                <Button variant="secondary" size="sm" {...describe(ids)}>
                  Change
                </Button>
              )}
            </Row>
            <Row label="Payment method" description={fullPlan.paymentMethod}>
              {(ids) => (
                <Button variant="secondary" size="sm" {...describe(ids)}>
                  Update
                </Button>
              )}
            </Row>
            <Row label="Invoices" description={fullPlan.invoices}>
              {(ids) => (
                <Button variant="secondary" size="sm" {...describe(ids)}>
                  View all
                </Button>
              )}
            </Row>
          </Rows>
        </div>
      </>
    ),
    integrations: (
      <Rows>
        {integrations.map((item) => (
          <Row key={item.id} label={item.name} description={item.description} icon={item.icon}>
            {(ids) =>
              item.id in values.integrations ? (
                <Switch {...ids} isSelected={values.integrations[item.id]} onChange={(v) => connect(item.id, v)} />
              ) : (
                <Button variant="secondary" size="sm" {...describe(ids)} onPress={() => connect(item.id, true)}>
                  Connect
                </Button>
              )
            }
          </Row>
        ))}
        <Row label="API keys" description="2 active keys, last used today." icon={<KeyRound />}>
          {(ids) => (
            <Button variant="secondary" size="sm" {...describe(ids)}>
              Manage
            </Button>
          )}
        </Row>
      </Rows>
    ),
  };

  return (
    <Modal {...props} size="lg" className={cn("h-[560px] overflow-clip", className)}>
      <Tabs
        orientation="vertical"
        variant="pill"
        selectedKey={current}
        onSelectionChange={select}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex w-14 shrink-0 flex-col border-e border-border bg-muted/50 p-2 sm:w-52 sm:p-3">
          <ModalTitle className="px-2.5 pt-2.5 pb-4 text-base leading-6 max-sm:sr-only">Settings</ModalTitle>
          <TabList aria-label="Sections" className="w-full self-stretch rounded-none bg-transparent p-0">
            {sections.map((s) => (
              <Tab key={s.id} id={s.id} className="h-9 justify-start px-2.5 max-sm:justify-center max-sm:px-0">
                {s.icon}
                <span className="max-sm:sr-only">{s.label}</span>
              </Tab>
            ))}
          </TabList>
        </div>
        {sections.map((s) => (
          <TabPanel key={s.id} id={s.id} className="flex min-h-0 flex-col rounded-none">
            <div className="shrink-0 px-6 pt-6 pe-14 pb-2 max-sm:px-5">
              <h3 className="text-lg leading-7 font-semibold tracking-[-0.01em] text-foreground">{s.label}</h3>
              <p className="text-sm leading-[22px] text-muted-foreground">{s.description}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-3 pb-6 max-sm:px-5">
              {content[s.id]}
            </div>
          </TabPanel>
        ))}
      </Tabs>
    </Modal>
  );
}

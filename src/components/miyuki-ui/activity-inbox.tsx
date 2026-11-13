"use client";

import { AtSign, Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { Button as AriaButton, type Key } from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Button } from "@/components/miyuki-ui/button";
import { Tab, TabList, TabPanel, Tabs } from "@/components/miyuki-ui/tabs";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

export type ActivityKind = "mention" | "system" | "activity";
export type ActivityTone = "neutral" | "brand" | "success" | "warning" | "destructive";
export type ActivityTab = "all" | "mentions" | "system";

export interface ActivityAction {
  id: string;
  label: string;
}

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  group: string;
  actor: string;
  message: ReactNode;
  time: string;
  avatar?: string;
  icon?: ReactNode;
  tone?: ActivityTone;
  quote?: ReactNode;
  unread?: boolean;
  actions?: ActivityAction[];
}

export interface ActivityEmptyState {
  title: ReactNode;
  description?: ReactNode;
}

const tones: Record<ActivityTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success-strong",
  warning: "bg-warning-soft text-warning-strong",
  destructive: "bg-destructive-soft text-destructive-strong",
};

const tabs: { id: ActivityTab; label: string; icon: ReactNode }[] = [
  { id: "all", label: "All", icon: <Inbox /> },
  { id: "mentions", label: "Mentions", icon: <AtSign /> },
  { id: "system", label: "System", icon: <Bell /> },
];

const defaultEmpty: Record<ActivityTab, ActivityEmptyState> = {
  all: { title: "You're all set", description: "New activity will show up here." },
  mentions: { title: "No mentions yet", description: "When someone mentions you or replies to you, it shows up here." },
  system: { title: "No system notices", description: "Updates about your account and service will appear here." },
};

const inTab = (item: ActivityItem, tab: ActivityTab) =>
  tab === "all" || (tab === "mentions" ? item.kind === "mention" : item.kind === "system");

export interface ActivityInboxProps extends Omit<ComponentProps<"section">, "title"> {
  items: ActivityItem[];
  title?: ReactNode;
  defaultTab?: ActivityTab;
  listHeight?: number;
  emptyStates?: Partial<Record<ActivityTab, ActivityEmptyState>>;
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
}

export function ActivityInbox({
  items,
  title = "Notifications",
  defaultTab = "all",
  listHeight = 440,
  emptyStates,
  onMarkAllRead,
  onMarkRead,
  onAction,
  className,
  ...props
}: ActivityInboxProps) {
  const titleId = useId();
  const [tab, setTab] = useState<Key>(defaultTab);
  const [read, setRead] = useState<ReadonlySet<string>>(() => new Set());
  const [sweep, setSweep] = useState<ReadonlyMap<string, number>>(() => new Map());

  const isUnread = (item: ActivityItem) => Boolean(item.unread) && !read.has(item.id);
  const unread = items.filter(isUnread);
  const unreadIn = (t: ActivityTab) => unread.filter((item) => inTab(item, t)).length;

  function markRead(id: string) {
    if (read.has(id)) return;
    setRead((prev) => new Set(prev).add(id));
    setSweep((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    onMarkRead?.(id);
  }

  function markAllRead() {
    const order = new Map<string, number>();
    unread.forEach((item, i) => order.set(item.id, Math.min(i * 40, 320)));
    setSweep(order);
    setRead((prev) => new Set([...prev, ...unread.map((item) => item.id)]));
    onMarkAllRead?.();
  }

  return (
    <section
      aria-labelledby={titleId}
      {...props}
      className={cn(
        "flex w-full max-w-[400px] flex-col overflow-clip rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base leading-6 font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          <p className="text-[13px] leading-5 text-muted-foreground tabular-nums" aria-live="polite">
            {unread.length === 0 ? "All caught up" : `${unread.length} unread`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconStart={<CheckCheck />}
          isDisabled={unread.length === 0}
          onPress={markAllRead}
          className="-me-2 text-muted-foreground data-[hovered]:text-foreground"
        >
          Mark all read
        </Button>
      </header>
      <Tabs variant="pill" selectedKey={tab} onSelectionChange={setTab} className="mt-4 gap-0">
        <div className="px-5 pb-4">
          <TabList aria-label="Filter notifications" className="flex w-full self-stretch">
            {tabs.map((t) => {
              const count = unreadIn(t.id);
              return (
                <Tab key={t.id} id={t.id} count={count > 0 ? count : undefined} className="min-w-0 flex-1 shrink px-2">
                  {t.label}
                </Tab>
              );
            })}
          </TabList>
        </div>
        {tabs.map((t) => {
          const list = items.filter((item) => inTab(item, t.id));
          const groups = [...new Set(list.map((item) => item.group))];
          const empty = { ...defaultEmpty[t.id], ...emptyStates?.[t.id] };
          return (
            <TabPanel
              key={t.id}
              id={t.id}
              className="flex-none overflow-y-auto overscroll-contain rounded-none border-t border-border"
              style={{ height: listHeight }}
            >
              {list.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-10 pb-6 text-center">
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border ring-inset [&_svg]:size-5"
                  >
                    {t.icon}
                  </span>
                  <p className="mt-4 text-sm leading-5 font-medium text-foreground">{empty.title}</p>
                  {empty.description != null && (
                    <p className="mt-1 max-w-[260px] text-[13px] leading-5 text-pretty text-muted-foreground">
                      {empty.description}
                    </p>
                  )}
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group} className="pb-1 last:pb-2">
                    <h3 className="px-5 pt-4 pb-1 text-xs leading-4 font-medium text-muted-foreground">{group}</h3>
                    <ul className="px-2">
                      {list
                        .filter((item) => item.group === group)
                        .map((item) => (
                          <Row
                            key={item.id}
                            item={item}
                            unread={isUnread(item)}
                            delay={sweep.get(item.id) ?? 0}
                            onMarkRead={() => markRead(item.id)}
                            onAction={(action) => {
                              markRead(item.id);
                              onAction?.(item.id, action);
                            }}
                          />
                        ))}
                    </ul>
                  </div>
                ))
              )}
            </TabPanel>
          );
        })}
      </Tabs>
    </section>
  );
}

function Lead({ item }: { item: ActivityItem }) {
  if (item.icon != null) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4",
          tones[item.tone ?? "neutral"],
        )}
      >
        {item.icon}
      </span>
    );
  }
  return <Avatar src={item.avatar} name={item.actor} size="md" aria-hidden="true" />;
}

function Row({
  item,
  unread,
  delay,
  onMarkRead,
  onAction,
}: {
  item: ActivityItem;
  unread: boolean;
  delay: number;
  onMarkRead: () => void;
  onAction: (action: string) => void;
}) {
  return (
    <li className="group/row relative flex gap-3 rounded-xl px-3 py-3 transition-colors duration-150 ease-settle hover:bg-accent/60 has-[[data-focus-visible]]:bg-accent/60">
      <Lead item={item} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 text-pretty">
          {unread && <span className="sr-only">Unread. </span>}
          <span className="font-medium text-foreground">{item.actor}</span>{" "}
          <span
            className={cn(
              "transition-colors duration-300 ease-settle",
              unread ? "text-foreground" : "text-muted-foreground",
            )}
            style={{ transitionDelay: `${delay}ms` }}
          >
            {item.message}
          </span>
        </p>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground tabular-nums">{item.time}</p>
        {item.quote != null && (
          <blockquote className="mt-2 border-s-2 border-border-strong ps-3 text-[13px] leading-5 text-pretty text-muted-foreground">
            {item.quote}
          </blockquote>
        )}
        {item.actions != null && item.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.actions.map((action, i) => (
              <Button
                key={action.id}
                size="sm"
                variant={i === 0 ? "secondary" : "ghost"}
                onPress={() => onAction(action.id)}
                className="h-7 rounded-md px-2.5 text-[13px]"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="relative flex w-6 shrink-0 justify-center">
        <span
          aria-hidden="true"
          className={cn(
            "mt-1.5 size-2 rounded-full bg-brand transition-[scale,opacity] duration-200 ease-settle motion-reduce:transition-opacity",
            unread
              ? "group-hover/row:scale-50 group-hover/row:opacity-0 group-has-[[data-focus-visible]]/row:opacity-0"
              : "scale-0 opacity-0",
          )}
          style={{ transitionDelay: `${delay}ms` }}
        />
        {unread && (
          <TooltipTrigger delay={400}>
            <AriaButton
              aria-label="Mark as read"
              onPress={onMarkRead}
              className={cn(
                "absolute -top-0.5 flex size-6 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none",
                "opacity-0 transition-[opacity,background-color,color] duration-150 ease-settle",
                "group-hover/row:opacity-100 data-[focus-visible]:opacity-100",
                "data-[hovered]:bg-background data-[hovered]:text-foreground data-[hovered]:shadow-xs",
                "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
              )}
            >
              <Check aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
            </AriaButton>
            <Tooltip placement="left">Mark as read</Tooltip>
          </TooltipTrigger>
        )}
      </div>
    </li>
  );
}

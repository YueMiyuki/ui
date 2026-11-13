"use client";

import {
  ChevronLeft,
  ChevronsUpDown,
  EllipsisVertical,
  Keyboard,
  LifeBuoy,
  LogOut,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownSeparator,
} from "@/components/miyuki-ui/dropdown";
import { SearchField } from "@/components/miyuki-ui/search-field";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const WIDE = 264;
const NARROW = 64;

export interface FloatingSidebarTeam {
  id: string;
  name: string;
  plan?: string;
  logo?: ReactNode;
}

export interface FloatingSidebarItem {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
  countTone?: "neutral" | "solid";
  href?: string;
}

export interface FloatingSidebarGroup {
  label: string;
  items: FloatingSidebarItem[];
}

export interface FloatingSidebarUser {
  name: string;
  email: string;
  avatar?: string;
}

const defaultFooterItems: FloatingSidebarItem[] = [
  { id: "support", label: "Support", icon: <LifeBuoy /> },
  { id: "settings", label: "Settings", icon: <Settings /> },
];

const fade = (hidden: boolean) =>
  cn(
    "transition-opacity ease-settle motion-reduce:transition-none",
    hidden ? "opacity-0 duration-100" : "opacity-100 delay-100 duration-200",
  );

const count = new Intl.NumberFormat("en-US");

function TeamMark({ team, small = false }: { team: FloatingSidebarTeam; small?: boolean }) {
  if (team.logo == null) {
    return <Avatar name={team.name} shape="rounded" size={small ? "xs" : "md"} aria-hidden="true" />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary text-primary-foreground",
        small ? "size-5 rounded-[5px] [&_svg]:size-3" : "size-8 rounded-lg [&_svg]:size-4",
      )}
    >
      {team.logo}
    </span>
  );
}

interface NavItemProps {
  item: FloatingSidebarItem;
  current: boolean;
  collapsed: boolean;
  highlight: string;
  onNavigate: (id: string) => void;
}

function NavItem({ item, current, collapsed, highlight, onNavigate }: NavItemProps) {
  const reduce = useReducedMotion();
  const solid = item.countTone === "solid";
  return (
    <TooltipTrigger isDisabled={!collapsed} delay={300}>
      <AriaLink
        href={item.href}
        aria-current={current ? "page" : undefined}
        onPress={() => onNavigate(item.id)}
        className={({ isHovered, isFocusVisible }) =>
          cn(
            "relative flex h-8 w-full cursor-default items-center gap-3 rounded-lg ps-3 pe-2 text-sm leading-5 font-medium outline-none select-none",
            "transition-[background-color,color] duration-150 ease-settle",
            current ? "text-brand-strong" : "text-foreground",
            !current && isHovered && "bg-accent/60",
            isFocusVisible && "ring-[3px] ring-ring",
          )
        }
      >
        {({ isHovered }) => (
          <>
            {current && (
              <motion.span
                layoutId={highlight}
                layoutDependency={item.id}
                aria-hidden="true"
                className="absolute inset-0 bg-brand-soft"
                style={{ borderRadius: 10 }}
                transition={reduce ? { duration: 0 } : SETTLE}
              >
                <span className="absolute start-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-e-full bg-brand" />
              </motion.span>
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 flex shrink-0 transition-colors duration-150 [&_svg]:size-4",
                current ? "text-brand-strong" : isHovered ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.icon}
              {solid && item.count != null && item.count > 0 && (
                <span
                  className={cn(
                    "absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-none font-semibold text-brand-foreground tabular-nums ring-2 ring-card",
                    "transition-[opacity,scale] duration-200 ease-settle",
                    collapsed ? "scale-100 opacity-100" : "scale-50 opacity-0",
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
            <span className={cn("relative z-10 min-w-0 flex-1 truncate", fade(collapsed))}>{item.label}</span>{" "}
            {item.count != null && (
              <span
                className={cn(
                  "relative z-10 shrink-0 tabular-nums",
                  fade(collapsed),
                  solid
                    ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-medium text-brand-foreground"
                    : cn("text-xs font-normal", current ? "text-brand-strong" : "text-muted-foreground"),
                )}
              >
                {count.format(item.count)}
              </span>
            )}
          </>
        )}
      </AriaLink>
      <Tooltip placement="right" offset={12}>
        {item.label}
        {item.count != null && item.count > 0 ? ` · ${count.format(item.count)}` : ""}
      </Tooltip>
    </TooltipTrigger>
  );
}

function NavList({
  items,
  labelledBy,
  ...rest
}: Omit<NavItemProps, "item" | "current"> & { items: FloatingSidebarItem[]; current: string; labelledBy?: string }) {
  return (
    <ul aria-labelledby={labelledBy} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item.id}>
          <NavItem {...rest} item={item} current={rest.current === item.id} />
        </li>
      ))}
    </ul>
  );
}

export interface FloatingSidebarProps extends Omit<ComponentProps<"aside">, "children"> {
  teams: FloatingSidebarTeam[];
  team?: string;
  defaultTeam?: string;
  onTeamChange?: (id: string) => void;
  onCreateTeam?: () => void;
  items: FloatingSidebarItem[];
  groups?: FloatingSidebarGroup[];
  footerItems?: FloatingSidebarItem[];
  user?: FloatingSidebarUser;
  onUserAction?: (action: string) => void;
  current?: string;
  defaultCurrent?: string;
  onNavigate?: (id: string) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  collapsible?: boolean;
  action?: ReactNode | ((state: { collapsed: boolean }) => ReactNode);
  onSearch?: (query: string) => void;
}

export function FloatingSidebar({
  teams,
  team,
  defaultTeam,
  onTeamChange,
  onCreateTeam,
  items,
  groups = [],
  footerItems = defaultFooterItems,
  user,
  onUserAction,
  current,
  defaultCurrent,
  onNavigate,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  collapsible = true,
  action,
  onSearch,
  className,
  style,
  "aria-label": ariaLabel = "Sidebar",
  ...props
}: FloatingSidebarProps) {
  const id = useId();
  const [ownTeam, setOwnTeam] = useState(defaultTeam ?? teams[0]?.id);
  const [ownCurrent, setOwnCurrent] = useState(defaultCurrent ?? items[0]?.id ?? "");
  const [ownCollapsed, setOwnCollapsed] = useState(defaultCollapsed);
  const teamId = team ?? ownTeam;
  const active = teams.find((t) => t.id === teamId) ?? teams[0];
  const here = current ?? ownCurrent;
  const narrow = collapsed ?? ownCollapsed;
  const search = useRef<HTMLDivElement>(null);
  const focusSearch = useRef(false);

  function setNarrow(next: boolean) {
    if (collapsed === undefined) setOwnCollapsed(next);
    onCollapsedChange?.(next);
  }

  function navigate(next: string) {
    if (current === undefined) setOwnCurrent(next);
    onNavigate?.(next);
  }

  function chooseTeam(next: string) {
    if (team === undefined) setOwnTeam(next);
    onTeamChange?.(next);
  }

  function openSearch() {
    focusSearch.current = true;
    setNarrow(false);
  }

  useEffect(() => {
    if (narrow || !focusSearch.current) return;
    focusSearch.current = false;
    search.current?.querySelector("input")?.focus();
  }, [narrow]);

  useEffect(() => {
    if (!narrow) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      focusSearch.current = true;
      if (collapsed === undefined) setOwnCollapsed(false);
      onCollapsedChange?.(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [narrow, collapsed, onCollapsedChange]);

  const nav = { current: here, collapsed: narrow, highlight: `${id}-highlight`, onNavigate: navigate };

  return (
    <aside
      {...props}
      aria-label={ariaLabel}
      data-collapsed={narrow || undefined}
      className={cn(
        "relative flex h-full max-h-full shrink-0 flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-md",
        "transition-[width] duration-300 ease-settle motion-reduce:transition-none",
        className,
      )}
      style={{ width: narrow ? NARROW : WIDE, ...style }}
    >
      {collapsible && (
        <AriaButton
          aria-label={narrow ? "Expand sidebar" : "Collapse sidebar"}
          onPress={() => setNarrow(!narrow)}
          className={({ isHovered, isFocusVisible }) =>
            cn(
              "absolute top-6 -end-3 z-10 flex size-6 cursor-default items-center justify-center rounded-full border bg-card shadow-sm outline-none",
              "transition-[border-color,color,scale] duration-150 ease-settle data-[pressed]:scale-90",
              isHovered ? "border-border-strong text-foreground" : "border-border text-muted-foreground",
              isFocusVisible && "ring-[3px] ring-ring",
            )
          }
        >
          <ChevronLeft
            aria-hidden="true"
            className={cn(
              "size-3.5 transition-transform duration-300 ease-settle motion-reduce:transition-none rtl:-scale-x-100",
              narrow && "rotate-180",
            )}
            strokeWidth={2.25}
          />
        </AriaButton>
      )}

      <div className="flex min-h-0 flex-1 flex-col p-3">
        {active != null && (
          <Dropdown>
            <AriaButton
              className={({ isHovered, isPressed, isFocusVisible }) =>
                cn(
                  "flex h-12 w-full shrink-0 cursor-default items-center gap-2.5 overflow-hidden rounded-xl ps-1 pe-2 text-start outline-none select-none",
                  "transition-[background-color,scale] duration-150 ease-settle",
                  (isHovered || isPressed) && "bg-accent",
                  isFocusVisible && "ring-[3px] ring-ring",
                )
              }
            >
              <TeamMark team={active} />
              <span className={cn("flex min-w-0 flex-1 flex-col", fade(narrow))}>
                <span className="truncate text-sm leading-5 font-semibold text-foreground">{active.name}</span>
                {active.plan != null && (
                  <span className="truncate text-xs leading-4 text-muted-foreground">{active.plan}</span>
                )}
              </span>
              <ChevronsUpDown
                aria-hidden="true"
                className={cn("size-4 shrink-0 text-muted-foreground", fade(narrow))}
              />
            </AriaButton>
            <DropdownMenu
              placement={narrow ? "end top" : "bottom start"}
              offset={narrow ? 14 : 6}
              indicator="check"
              popoverClassName="w-[248px]"
            >
              <DropdownSection
                title="Teams"
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[active.id]}
                onSelectionChange={(keys) => {
                  const [next] = keys === "all" ? [] : [...keys];
                  if (next != null) chooseTeam(String(next));
                }}
              >
                {teams.map((t) => (
                  <DropdownItem key={t.id} id={t.id} textValue={t.name} icon={<TeamMark team={t} small />}>
                    {t.name}
                  </DropdownItem>
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownItem id="create-team" icon={<Plus />} onAction={onCreateTeam}>
                Create team
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}

        <div className="mt-3 grid shrink-0 grid-cols-1">
          <SearchField
            ref={search}
            size="sm"
            aria-label="Quick search"
            placeholder="Quick search"
            shortcut="⌘K"
            onSubmit={onSearch}
            className={cn(
              "col-start-1 row-start-1 min-w-0 transition-[opacity,visibility] ease-settle motion-reduce:transition-none",
              narrow ? "invisible opacity-0 duration-100" : "visible opacity-100 delay-100 duration-200",
            )}
          />
          <TooltipTrigger isDisabled={!narrow} delay={300}>
            <AriaButton
              aria-label="Quick search"
              onPress={openSearch}
              className={({ isHovered, isFocusVisible }) =>
                cn(
                  "col-start-1 row-start-1 flex h-8 w-full cursor-default items-center rounded-lg border border-input bg-card ps-[11px] text-muted-foreground shadow-xs outline-none",
                  "transition-[border-color,color,opacity] duration-150 ease-settle",
                  isHovered && "border-border-strong text-foreground",
                  isFocusVisible && "ring-[3px] ring-ring",
                  !narrow && "invisible opacity-0",
                )
              }
            >
              <Search aria-hidden="true" className="size-4" strokeWidth={2} />
            </AriaButton>
            <Tooltip placement="right" offset={12} shortcut="⌘K">
              Quick search
            </Tooltip>
          </TooltipTrigger>
        </div>

        {action != null && (
          <div className="mt-3 flex shrink-0 flex-col">
            {typeof action === "function" ? action({ collapsed: narrow }) : action}
          </div>
        )}

        <nav
          aria-label="Main"
          className="-mx-1 mt-4 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <LayoutGroup id={id}>
            <NavList {...nav} items={items} />
            {groups.map((group, i) => (
              <div key={group.label} className={cn(items.length > 0 || i > 0 ? "mt-5" : "mt-1")}>
                <div className="relative mb-1 h-6">
                  <p
                    id={`${id}-group-${i}`}
                    className={cn("truncate px-3 text-xs leading-6 font-medium text-muted-foreground", fade(narrow))}
                  >
                    {group.label}
                  </p>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-x-2 top-1/2 h-px bg-border transition-opacity duration-200",
                      narrow ? "opacity-100" : "opacity-0",
                    )}
                  />
                </div>
                <NavList {...nav} items={group.items} labelledBy={`${id}-group-${i}`} />
              </div>
            ))}
            {footerItems.length > 0 && (
              <div className="mt-auto pt-4">
                <NavList {...nav} items={footerItems} />
              </div>
            )}
          </LayoutGroup>
        </nav>

        {user != null && (
          <div className="mt-2 shrink-0 border-t border-border pt-2">
            <Dropdown>
              <AriaButton
                aria-label={`${user.name}, account menu`}
                className={({ isHovered, isPressed, isFocusVisible }) =>
                  cn(
                    "group/user flex h-12 w-full cursor-default items-center gap-2.5 overflow-hidden rounded-xl ps-1 pe-1 text-start outline-none select-none",
                    "transition-colors duration-150 ease-settle",
                    (isHovered || isPressed) && "bg-accent",
                    isFocusVisible && "ring-[3px] ring-ring",
                  )
                }
              >
                <Avatar src={user.avatar} name={user.name} size="md" aria-hidden="true" />
                <span className={cn("flex min-w-0 flex-1 flex-col", fade(narrow))}>
                  <span className="truncate text-sm leading-5 font-medium text-foreground">{user.name}</span>
                  <span className="truncate text-xs leading-4 text-muted-foreground">{user.email}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                    "group-data-[hovered]/user:bg-background group-data-[hovered]/user:text-foreground group-data-[hovered]/user:shadow-xs",
                    fade(narrow),
                  )}
                >
                  <EllipsisVertical className="size-4" />
                </span>
              </AriaButton>
              <DropdownMenu
                placement={narrow ? "end bottom" : "top end"}
                offset={narrow ? 14 : 6}
                popoverClassName="w-[248px]"
                onAction={(key) => onUserAction?.(String(key))}
              >
                <DropdownSection title={user.email}>
                  <DropdownItem id="profile" icon={<UserRound />}>
                    Profile
                  </DropdownItem>
                  <DropdownItem id="preferences" icon={<SlidersHorizontal />}>
                    Preferences
                  </DropdownItem>
                  <DropdownItem id="shortcuts" icon={<Keyboard />} shortcut="?">
                    Keyboard shortcuts
                  </DropdownItem>
                </DropdownSection>
                <DropdownSeparator />
                <DropdownItem id="sign-out" icon={<LogOut />}>
                  Sign out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
      </div>
    </aside>
  );
}

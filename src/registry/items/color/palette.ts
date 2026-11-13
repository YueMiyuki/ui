import { contrast, formatOklch, type Oklab, parse } from "./color-math";

type Kind = "fill" | "text" | "border" | "ring";

export interface Token {
  name: string;
  utility: string;
  kind: Kind;
  on?: string;
}

interface TokenRow {
  label?: string;
  tokens: Token[];
}

export interface TokenGroup {
  id: string;
  title: string;
  blurb: string;
  rows: TokenRow[];
}

export interface Named {
  name: string;
  fill: string;
  fg: string;
  sentence: string;
}

export interface Pair {
  fill: string;
  fg: string;
  sample: string;
}

const fill = (name: string): Token => ({ name, utility: `bg-${name}`, kind: "fill" });
const text = (name: string, on: string): Token => ({ name, utility: `text-${name}`, kind: "text", on });
const family = (name: string): Token[] => [
  fill(name),
  text(`${name}-foreground`, name),
  fill(`${name}-soft`),
  text(`${name}-strong`, `${name}-soft`),
];

export const named: Named[] = [
  {
    name: "Snow",
    fill: "background",
    fg: "foreground",
    sentence: "The surface everything sits on, shaded blue and never grey.",
  },
  {
    name: "Water",
    fill: "brand",
    fg: "brand-foreground",
    sentence: "State: whatever is selected, checked, focused or in progress fills with it.",
  },
  {
    name: "Ink",
    fill: "primary",
    fg: "primary-foreground",
    sentence: "Text and the main action, blue-black by day and snow white at night.",
  },
  {
    name: "Camellia",
    fill: "destructive",
    fg: "destructive-foreground",
    sentence: "The one warm note, kept for errors and destructive actions.",
  },
  {
    name: "Pine",
    fill: "success",
    fg: "success-foreground",
    sentence: "Success: a saved change, an open pass, a station back online.",
  },
  {
    name: "Yuzu",
    fill: "warning",
    fg: "warning-foreground",
    sentence: "Warning, raised before something goes wrong rather than after.",
  },
];

export const groups: TokenGroup[] = [
  {
    id: "surfaces",
    title: "Surfaces",
    blurb: "The page, raised and floating layers, and the fills for wells, soft controls and hover.",
    rows: [{ tokens: ["background", "card", "popover", "muted", "secondary", "accent"].map(fill) }],
  },
  {
    id: "text",
    title: "Text",
    blurb: "Body text, secondary text and the foreground that belongs to each surface, shown on it.",
    rows: [
      {
        tokens: [
          text("foreground", "background"),
          text("muted-foreground", "background"),
          text("card-foreground", "card"),
          text("popover-foreground", "popover"),
          text("secondary-foreground", "secondary"),
          text("accent-foreground", "accent"),
        ],
      },
    ],
  },
  {
    id: "state",
    title: "State",
    blurb:
      "Ink, water and the three status colours. Each has a fill and its text, and the status colours add a soft tint with a strong step for text on it.",
    rows: [
      { label: "Ink", tokens: [fill("primary"), text("primary-foreground", "primary")] },
      { label: "Water", tokens: family("brand") },
      { label: "Camellia", tokens: family("destructive") },
      { label: "Pine", tokens: family("success") },
      { label: "Yuzu", tokens: family("warning") },
    ],
  },
  {
    id: "borders",
    title: "Borders",
    blurb: "Hairlines, control outlines and the focus ring, which is water at 40%.",
    rows: [
      {
        tokens: [
          { name: "border", utility: "border-border", kind: "border" },
          { name: "border-strong", utility: "border-border-strong", kind: "border" },
          { name: "input", utility: "border-input", kind: "border" },
          { name: "ring", utility: "ring-ring", kind: "ring" },
        ],
      },
    ],
  },
  {
    id: "charts",
    title: "Charts",
    blurb: "Data and effect hues, in order: water, seafoam, wisteria, yuzu, camellia and plum.",
    rows: [{ tokens: [1, 2, 3, 4, 5, 6].map((n) => fill(`chart-${n}`)) }],
  },
];

export const pairs: Pair[] = [
  { fill: "background", fg: "foreground", sample: "Snow report for Hakuba" },
  { fill: "card", fg: "card-foreground", sample: "Two nights at the Kiso hut" },
  { fill: "popover", fg: "popover-foreground", sample: "Copy link to route" },
  { fill: "muted", fg: "muted-foreground", sample: "No readings since 04:00" },
  { fill: "secondary", fg: "secondary-foreground", sample: "Add to list" },
  { fill: "accent", fg: "accent-foreground", sample: "Matsumoto, 6 trains" },
  { fill: "primary", fg: "primary-foreground", sample: "Save changes" },
  { fill: "brand", fg: "brand-foreground", sample: "Book a seat" },
  { fill: "brand-soft", fg: "brand-strong", sample: "3 seats left on the 07:12" },
  { fill: "destructive", fg: "destructive-foreground", sample: "Delete route" },
  { fill: "destructive-soft", fg: "destructive-strong", sample: "Pass closed by snow" },
  { fill: "success", fg: "success-foreground", sample: "Saved" },
  { fill: "success-soft", fg: "success-strong", sample: "All 41 stations reporting" },
  { fill: "warning", fg: "warning-foreground", sample: "2 delays" },
  { fill: "warning-soft", fg: "warning-strong", sample: "Avalanche risk rising" },
];

export const shadows = [
  { utility: "shadow-xs", use: "Inputs, secondary buttons" },
  { utility: "shadow-sm", use: "Cards at rest" },
  { utility: "shadow-md", use: "Cards on hover, sticky bars" },
  { utility: "shadow-lg", use: "Popovers, menus, tooltips" },
  { utility: "shadow-xl", use: "Dialogs, drawers" },
  { utility: "shadow-2xl", use: "Large floating showpieces" },
];

export const pairKey = (pair: Pair) => `${pair.fill}/${pair.fg}`;

const names = [...new Set(groups.flatMap((g) => g.rows.flatMap((r) => r.tokens.map((t) => t.name))))];

export interface Resolved {
  scheme: string;
  values: Record<string, string>;
  ratios: Record<string, number>;
}

export function resolve(el: Element): Resolved {
  const style = getComputedStyle(el);
  const parsed: Record<string, Oklab> = {};
  const values: Record<string, string> = {};
  for (const name of names) {
    const raw = style.getPropertyValue(`--${name}`).trim();
    if (!raw) continue;
    parsed[name] = parse(raw, el);
    values[name] = formatOklch(parsed[name]);
  }
  const ratios: Record<string, number> = {};
  for (const pair of pairs) {
    const fill = parsed[pair.fill];
    const fg = parsed[pair.fg];
    if (fill && fg) ratios[pairKey(pair)] = contrast(fill, fg);
  }
  return { scheme: style.getPropertyValue("color-scheme").trim(), values, ratios };
}

export interface Family {
  id: string;
  className: string;
  role: string;
  utilities: string[];
  description: string;
  specimen: string;
  specimenClass: string;
  detail?: string;
  glyphs: string;
}

export const families: Family[] = [
  {
    id: "sans",
    className: "font-sans",
    role: "Interface and display",
    utilities: ["font-sans", "font-display"],
    description:
      "All interface text. Display text is the same family at weight 600 with tight leading and tracking, kept for headlines, section titles and large numerals.",
    specimen: "Fresh snow above 1,500 m, clearing by noon",
    specimenClass: "text-[28px] leading-[1.2] tracking-[-0.015em]",
    glyphs: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 ° − ’ “ ” & ? !",
  },
  {
    id: "mono",
    className: "font-mono",
    role: "Code",
    utilities: ["font-mono"],
    description: "Code, commands, file paths and keyboard shortcuts. Never data labels or figures in a table.",
    specimen: 'read("kiso-02").depth',
    specimenClass: "text-xl leading-[1.3]",
    detail: "src/forecast/hakuba.ts  ⌘K",
    glyphs: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0O 1lI {} [] () => !== ;",
  },
  {
    id: "pixel",
    className: "font-pixel",
    role: "Brand",
    utilities: ["font-pixel"],
    description:
      "The docs site's own brand moments, such as the wordmark and the home headline. Components never use it.",
    specimen: "miyuki-ui",
    specimenClass: "text-[56px] leading-none",
    glyphs: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789",
  },
];

export interface Size {
  utility: string;
  className: string;
  role?: string;
  sample: string;
}

export const sizes: Size[] = [
  { utility: "text-xs", className: "text-xs", role: "Captions", sample: "Updated 06:40 from 41 stations" },
  {
    utility: "text-[13px]",
    className: "text-[13px]",
    role: "Dense interface",
    sample: "Wind 14 km/h from the north-west, gusting 31",
  },
  {
    utility: "text-sm",
    className: "text-sm",
    role: "Controls and component text",
    sample: "Hakuba Goryu reports 32 cm of new snow overnight.",
  },
  {
    utility: "text-base",
    className: "text-base",
    role: "Reading text",
    sample: "The first train to Matsumoto leaves at 05:52 from platform 2.",
  },
  { utility: "text-lg", className: "text-lg", sample: "Clear skies over Lake Tōya until noon" },
  { utility: "text-xl", className: "text-xl", sample: "Avalanche risk moderate above 1,800 m" },
  { utility: "text-2xl", className: "text-2xl", sample: "Fresh snow in Nozawa" },
  { utility: "text-3xl", className: "text-3xl", sample: "Sea fog in Otaru harbour" },
  { utility: "text-4xl", className: "text-4xl", sample: "Kiso valley, 4°C" },
  { utility: "text-5xl", className: "text-5xl", sample: "Snow tonight" },
  { utility: "text-6xl", className: "text-6xl", sample: "182 cm" },
  { utility: "text-7xl", className: "text-7xl", sample: "−12°C" },
];

export interface Display {
  className: string;
  width: string;
  text: string;
}

export const displays: Display[] = [
  {
    className: "font-display text-7xl font-semibold leading-[1.05] tracking-[-0.03em]",
    width: "max-w-4xl",
    text: "Snow returns to Hakuba after a dry week",
  },
  {
    className: "font-display text-5xl font-semibold leading-[1.05] tracking-[-0.03em]",
    width: "max-w-2xl",
    text: "The last ferry from Otaru leaves at 17:40",
  },
  {
    className: "font-display text-4xl font-semibold leading-[1.1] tracking-[-0.025em]",
    width: "max-w-xl",
    text: "Three clear nights ahead for the observatory",
  },
  {
    className: "font-display text-2xl font-semibold leading-tight tracking-[-0.015em]",
    width: "max-w-md",
    text: "Forty-one stations report new snow above 1,500 m this morning",
  },
];

export interface Body {
  utility: string;
  className: string;
  measure: string;
  role: string;
  text: string;
}

export const bodies: Body[] = [
  {
    utility: "text-base",
    className: "text-base max-w-[31rem]",
    measure: "max-w-[31rem]",
    role: "Reading text",
    text: "The snow report is published at six every morning from forty-one stations between Otaru and Kiso. Each reading gives the new snow in the last twenty-four hours, the settled depth, the temperature at the summit and the state of the roads below. When a station misses a reading, the last value stays on the board with the time it was taken, so nothing you see is a guess.",
  },
  {
    utility: "text-sm",
    className: "text-sm max-w-[27rem]",
    measure: "max-w-[27rem]",
    role: "Component text",
    text: "Hut bookings open on the first of each month at 09:00. A booking holds a bunk and an evening meal, and can be moved once at no charge up to three days before you arrive. If snow closes the pass, we move your booking to the next open night and send you a message before 07:00.",
  },
];

export const stations = [
  { name: "Niseko", fresh: 38, depth: 281, low: -11.7 },
  { name: "Hakuba", fresh: 14, depth: 196, low: -8.4 },
  { name: "Nozawa", fresh: 21, depth: 211, low: -6.1 },
  { name: "Aomori", fresh: 19, depth: 148, low: -5.9 },
  { name: "Otaru", fresh: 7, depth: 111, low: -4 },
  { name: "Kiso", fresh: 1, depth: 41, low: -1.1 },
];

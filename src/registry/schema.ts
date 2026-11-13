export const CATEGORIES = [
  {
    id: "backgrounds",
    label: "Backgrounds & effects",
    blurb: "Grids, light, weather and texture to set behind content",
  },
  {
    id: "cards",
    label: "Cards",
    blurb: "Surfaces that hold one piece of content and answer the pointer",
  },
  {
    id: "text",
    label: "Text effects",
    blurb: "Headlines that type, reveal, shimmer or rearrange themselves",
  },
  {
    id: "scroll",
    label: "Scroll & parallax",
    blurb: "Motion tied to how far the page has scrolled",
  },
  {
    id: "cursor",
    label: "Cursor & pointer",
    blurb: "Effects that follow the pointer or answer it",
  },
  {
    id: "buttons",
    label: "Buttons",
    blurb: "Actions, from plain buttons to ones with a little motion",
  },
  {
    id: "inputs",
    label: "Inputs & forms",
    blurb: "Fields, toggles and the other parts of a form",
  },
  {
    id: "pickers",
    label: "Selection & pickers",
    blurb: "Choosing a value: selects, comboboxes, dates and colours",
  },
  {
    id: "overlays",
    label: "Overlays",
    blurb: "Dialogs, drawers, popovers, menus and tooltips",
  },
  {
    id: "navigation",
    label: "Navigation",
    blurb: "Headers, tabs, docks, breadcrumbs and banners",
  },
  {
    id: "display",
    label: "Data display",
    blurb: "Tables, lists, badges, timelines and figures",
  },
  {
    id: "media",
    label: "Carousels & media",
    blurb: "Carousels, galleries, image comparisons and players",
  },
  {
    id: "layout",
    label: "Layout & grids",
    blurb: "Bento grids, columns and the structure of a page",
  },
  {
    id: "maps",
    label: "Globes & maps",
    blurb: "Globes, world maps and the routes between places",
  },
  {
    id: "charts",
    label: "Charts",
    blurb: "Lines, bars, areas and flows drawn from your data",
  },
  {
    id: "ai",
    label: "AI & agents",
    blurb: "Chat, prompts, streamed answers and agent activity",
  },
  {
    id: "blocks",
    label: "Blocks",
    blurb: "Larger assemblies: heroes, pricing, footers and feature sections",
  },
  {
    id: "templates",
    label: "Templates",
    blurb: "Full pages to start a product, a portfolio or a launch",
  },
  {
    id: "labs",
    label: "Labs",
    blurb: "Experiments that do not fit anywhere else yet",
  },
  {
    id: "foundations",
    label: "Foundations",
    blurb: "Tokens, type, icons and the small pieces everything else uses",
  },
] as const satisfies readonly { id: string; label: string; blurb: string }[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type Category = (typeof CATEGORIES)[number];

export type PreviewLayout = "center" | "fill";

interface PreviewMeta {
  layout?: PreviewLayout;
  height?: number;
  iframe?: boolean;
  thumb?: boolean;
  settle?: number;
  thumbClick?: string | string[];
}

type ResolvedPreview = Required<Omit<PreviewMeta, "settle" | "thumbClick">> &
  Pick<PreviewMeta, "settle" | "thumbClick">;

interface PropDoc {
  name: string;
  type: string;
  default?: string;
  description: string;
}

export interface ComponentPropsDoc {
  component: string;
  props: PropDoc[];
}

interface ResolvedDemo {
  name: string;
  title: string;
  file: string;
}

type RegistryItemType = "registry:ui" | "registry:block";

export interface RegistryItem {
  slug: string;
  name: string;
  category: CategoryId;
  description: string;
  original: boolean;
  suspense?: boolean;
  type: RegistryItemType;
  files: string[];
  demos: ResolvedDemo[];
  preview: ResolvedPreview;
  props: ComponentPropsDoc[];
  dependencies: string[];
  registryDependencies: string[];
  libs: string[];
  devDependencies: string[];
}

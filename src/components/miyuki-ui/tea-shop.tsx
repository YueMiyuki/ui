"use client";

import { ChevronLeft, ShoppingBag, Timer, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type CSSProperties, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/miyuki-ui/badge";
import { Button } from "@/components/miyuki-ui/button";
import { Chip } from "@/components/miyuki-ui/chip";
import { DialThermostat } from "@/components/miyuki-ui/dial-thermostat";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/miyuki-ui/drawer";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { NumberField } from "@/components/miyuki-ui/number-field";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { ReceiptCard, type ReceiptCardHandle, type ReceiptLine } from "@/components/miyuki-ui/receipt-card";
import { SearchField } from "@/components/miyuki-ui/search-field";
import { Steam } from "@/components/miyuki-ui/steam";
import { cn } from "@/lib/utils";

export interface TeaShopProps extends Omit<ComponentProps<"div">, "children"> {
  image?: (key: string) => string | undefined;
}

type TeaType = "Sencha" | "Gyokuro" | "Hōjicha" | "Genmaicha" | "Matcha" | "Black tea";
type Harvest = "First flush" | "Second flush" | "Autumn";
type PriceBand = "Under ¥1,500" | "¥1,500 to ¥2,500" | "Over ¥2,500";

interface Tea {
  id: string;
  name: string;
  origin: string;
  type: TeaType;
  harvest: Harvest;
  price: number;
  grams: number;
  temp: number;
  seconds: number;
  leaf: number;
  water: number;
  infusions: number;
  notes: string[];
  description: string;
  seasonal?: boolean;
  low?: boolean;
}

const TEAS: Tea[] = [
  {
    id: "yukimuro",
    name: "Yukimuro sencha",
    origin: "Murakami, Niigata",
    type: "Sencha",
    harvest: "First flush",
    price: 2480,
    grams: 80,
    temp: 70,
    seconds: 60,
    leaf: 4,
    water: 120,
    infusions: 3,
    notes: ["Sweet pea", "Chestnut", "Cool, clean finish"],
    description:
      "Last May's first flush from the northernmost tea gardens in Japan, sealed and kept since November in a storehouse cooled by four hundred tonnes of snow. The cold, still air rounds off the young grassiness and leaves a cup that is calmer and sweeter than the day it was picked.",
    seasonal: true,
  },
  {
    id: "kawane",
    name: "Kawane asamushi",
    origin: "Kawane, Shizuoka",
    type: "Sencha",
    harvest: "First flush",
    price: 1620,
    grams: 100,
    temp: 75,
    seconds: 60,
    leaf: 4,
    water: 120,
    infusions: 3,
    notes: ["Cut grass", "Toasted nori", "Bright"],
    description:
      "Lightly steamed leaf from steep river terraces where the morning mist sits until ten. A clear, golden-green cup with a crisp edge, and the tea we reach for with breakfast.",
  },
  {
    id: "sayama",
    name: "Sayama-kaori",
    origin: "Sayama, Saitama",
    type: "Sencha",
    harvest: "Second flush",
    price: 1180,
    grams: 100,
    temp: 80,
    seconds: 45,
    leaf: 4,
    water: 150,
    infusions: 3,
    notes: ["Roasted grain", "Honey", "Firm body"],
    description:
      "Sayama finishes its tea with a strong final firing, which gives this everyday sencha its warm, rounded body. Forgiving with hot water and long steeps.",
  },
  {
    id: "yame-kabuse",
    name: "Yame kabusecha",
    origin: "Yame, Fukuoka",
    type: "Sencha",
    harvest: "First flush",
    price: 1980,
    grams: 80,
    temp: 65,
    seconds: 90,
    leaf: 5,
    water: 120,
    infusions: 3,
    notes: ["Umami", "Spinach", "Soft sweetness"],
    description:
      "Shaded under straw for ten days before picking, which slows the leaf and deepens its colour. Halfway between sencha and gyokuro: thick and sweet in the cup.",
  },
  {
    id: "uji-gyokuro",
    name: "Uji gyokuro",
    origin: "Uji, Kyoto",
    type: "Gyokuro",
    harvest: "First flush",
    price: 3240,
    grams: 50,
    temp: 55,
    seconds: 120,
    leaf: 6,
    water: 60,
    infusions: 4,
    notes: ["Broth", "Sweet seaweed", "Long finish"],
    description:
      "Three weeks in the shade and picked by hand. Brew it cool and small: a few spoonfuls of thick, savoury liquor, best sipped slowly.",
    low: true,
  },
  {
    id: "hoshino",
    name: "Hoshino gyokuro",
    origin: "Hoshino, Fukuoka",
    type: "Gyokuro",
    harvest: "First flush",
    price: 4320,
    grams: 50,
    temp: 50,
    seconds: 150,
    leaf: 6,
    water: 60,
    infusions: 4,
    notes: ["Rich umami", "Melon", "Creamy"],
    description:
      "From a mountain village above Yame, where the gardens are steep and foggy. Our most concentrated tea; brew it barely warm if you have the patience.",
  },
  {
    id: "kaga-bocha",
    name: "Kaga bōcha",
    origin: "Kanazawa, Ishikawa",
    type: "Hōjicha",
    harvest: "Autumn",
    price: 980,
    grams: 100,
    temp: 95,
    seconds: 30,
    leaf: 5,
    water: 150,
    infusions: 2,
    notes: ["Toasted wood", "Caramel", "Gentle"],
    description:
      "Roasted tea stems, a Kanazawa speciality, with the sweetness of toffee and almost no bitterness. Low in caffeine, so it is what we drink after dinner.",
  },
  {
    id: "murakami-hoji",
    name: "Murakami hōjicha",
    origin: "Murakami, Niigata",
    type: "Hōjicha",
    harvest: "Autumn",
    price: 1080,
    grams: 100,
    temp: 95,
    seconds: 30,
    leaf: 5,
    water: 150,
    infusions: 2,
    notes: ["Charcoal", "Brown sugar", "Smoky"],
    description:
      "Autumn leaf from our own town, roasted in small batches over charcoal every Monday. Deep amber and smoky, and good with milk on a cold morning.",
  },
  {
    id: "chiran",
    name: "Chiran genmaicha",
    origin: "Chiran, Kagoshima",
    type: "Genmaicha",
    harvest: "Second flush",
    price: 760,
    grams: 200,
    temp: 85,
    seconds: 40,
    leaf: 5,
    water: 150,
    infusions: 2,
    notes: ["Popped rice", "Toasty", "Light"],
    description:
      "Southern sencha mixed half and half with roasted and popped brown rice. Nutty and easy, and the tea most of the shop is drinking at four o'clock.",
  },
  {
    id: "sayama-black",
    name: "Sayama wakōcha",
    origin: "Sayama, Saitama",
    type: "Black tea",
    harvest: "Second flush",
    price: 1540,
    grams: 50,
    temp: 95,
    seconds: 180,
    leaf: 3,
    water: 200,
    infusions: 2,
    notes: ["Malt", "Dried fig", "No harshness"],
    description:
      "Japanese black tea made from sencha cultivars, gentler than its cousins from further south. Drink it plain; it has no bitterness to cover.",
  },
  {
    id: "uji-matcha",
    name: "Uji matcha",
    origin: "Uji, Kyoto",
    type: "Matcha",
    harvest: "First flush",
    price: 2860,
    grams: 30,
    temp: 80,
    seconds: 15,
    leaf: 2,
    water: 70,
    infusions: 1,
    notes: ["Fresh cream", "Cocoa", "Vivid green"],
    description:
      "Stone-milled from shaded first-flush leaf, sifted and packed in tins of thirty grams. Whisk two scoops into seventy millilitres of water for a thin, everyday bowl.",
  },
  {
    id: "kirishima",
    name: "Kirishima kōcha",
    origin: "Kirishima, Kagoshima",
    type: "Black tea",
    harvest: "Second flush",
    price: 1320,
    grams: 60,
    temp: 95,
    seconds: 150,
    leaf: 3,
    water: 200,
    infusions: 2,
    notes: ["Citrus peel", "Honey", "Brisk"],
    description:
      "Grown on the slopes of a volcano at the southern end of Kyushu. Brighter than the Sayama, with a note of yuzu peel.",
  },
];

const TYPES: TeaType[] = ["Sencha", "Gyokuro", "Hōjicha", "Genmaicha", "Matcha", "Black tea"];
const HARVESTS: Harvest[] = ["First flush", "Second flush", "Autumn"];
const PRICES: PriceBand[] = ["Under ¥1,500", "¥1,500 to ¥2,500", "Over ¥2,500"];

const TINTS: Record<TeaType, { hue: string; shade?: string }> = {
  Sencha: { hue: "oklch(0.8 0.13 122)" },
  Gyokuro: { hue: "oklch(0.7 0.13 148)" },
  Hōjicha: { hue: "oklch(0.62 0.11 58)", shade: "oklch(0.78 0.07 62)" },
  Genmaicha: { hue: "oklch(0.84 0.12 92)" },
  Matcha: { hue: "oklch(0.74 0.18 138)" },
  "Black tea": { hue: "oklch(0.56 0.14 38)", shade: "oklch(0.8 0.06 50)" },
};

const FREE_SHIPPING = 5000;
const SHIPPING = 550;
const CARD = "4821";

const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;
const band = (price: number): PriceBand =>
  price < 1500 ? "Under ¥1,500" : price <= 2500 ? "¥1,500 to ¥2,500" : "Over ¥2,500";
const steep = (s: number) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);
const teaOf = (id: string) => TEAS.find((t) => t.id === id) ?? TEAS[0];

interface Line {
  id: string;
  qty: number;
}

interface Order {
  number: string;
  code: string;
  lines: Line[];
  subtotal: number;
  shipping: number;
  total: number;
}

type Filters = { type: string[]; harvest: string[]; price: string[] };

const GROUPS: { key: keyof Filters; label: string; options: string[] }[] = [
  { key: "type", label: "Type", options: TYPES },
  { key: "harvest", label: "Harvest", options: HARVESTS },
  { key: "price", label: "Price", options: PRICES },
];

function totals(lines: Line[]) {
  const subtotal = lines.reduce((sum, l) => sum + teaOf(l.id).price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING;
  return { subtotal, shipping, total: subtotal + shipping };
}

export function TeaShop({ image, className, ...props }: TeaShopProps) {
  const reduce = useReducedMotion() ?? false;
  const [productId, setProductId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({ type: [], harvest: [], price: [] });
  const [cart, setCart] = useState<Line[]>([
    { id: "kawane", qty: 1 },
    { id: "kaga-bocha", qty: 2 },
  ]);
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState(0);
  const [paying, setPaying] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const addedTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  const count = cart.reduce((sum, l) => sum + l.qty, 0);
  const product = productId ? teaOf(productId) : null;

  const add = (id: string, qty = 1) => {
    setCart((list) => {
      const found = list.find((l) => l.id === id);
      if (found) return list.map((l) => (l.id === id ? { ...l, qty: Math.min(12, l.qty + qty) } : l));
      return [...list, { id, qty }];
    });
    setJustAdded(id);
    setAnnounce(`Added ${qty} ${teaOf(id).name} to your cart`);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded(null), 1600);
  };

  const openProduct = (id: string | null) => {
    setProductId(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const openCart = () => {
    setOrder(null);
    setOpen(true);
  };

  const pay = () => {
    setPaying(true);
    window.setTimeout(
      () => {
        const t = totals(cart);
        const n = 4417 + orders;
        setOrder({
          number: `YT-0213-${n}`,
          code: `4902130${String(n).padStart(5, "0")}`,
          lines: cart,
          ...t,
        });
        setOrders((o) => o + 1);
        setCart([]);
        setPaying(false);
      },
      reduce ? 300 : 900,
    );
  };

  const q = query.trim().toLowerCase();
  const shown = TEAS.filter(
    (t) =>
      (q === "" || `${t.name} ${t.origin} ${t.type}`.toLowerCase().includes(q)) &&
      (filters.type.length === 0 || filters.type.includes(t.type)) &&
      (filters.harvest.length === 0 || filters.harvest.includes(t.harvest)) &&
      (filters.price.length === 0 || filters.price.includes(band(t.price))),
  );
  const filtered = q !== "" || filters.type.length + filters.harvest.length + filters.price.length > 0;

  const toggle = (key: keyof Filters, value: string, on: boolean) =>
    setFilters((f) => ({ ...f, [key]: on ? [...f[key], value] : f[key].filter((v) => v !== value) }));

  return (
    <div {...props} className={cn("min-h-dvh bg-background text-foreground", className)}>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
          <a
            href="#teas"
            onClick={(event) => {
              event.preventDefault();
              openProduct(null);
            }}
            className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 text-brand-strong">
              <path d="M4.5 19.5C4.5 10.5 10.5 4.5 19.5 4.5c0 9-6 15-15 15Z" fill="currentColor" />
              <path d="M4.5 19.5 13 11" stroke="var(--background)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[15px] font-semibold tracking-[-0.01em]">
              Yukimi<span className="hidden sm:inline"> Tea</span>
            </span>
          </a>
          <p className="hidden text-[13px] text-muted-foreground lg:block">Roasted to order in Murakami</p>
          <SearchField
            size="sm"
            aria-label="Search teas"
            placeholder="Search teas"
            value={query}
            onChange={(value) => {
              setQuery(value);
              if (productId) setProductId(null);
            }}
            className="ms-auto w-full min-w-0 sm:max-w-64"
          />
          <Button
            variant="secondary"
            onPress={openCart}
            aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
            iconStart={<ShoppingBag />}
            className="px-2.5 sm:px-3.5"
          >
            <span className="hidden sm:inline">Cart</span>
            <motion.span
              key={count}
              initial={reduce ? false : { scale: 1.35 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums sm:ms-1.5",
                count > 0 ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </motion.span>
          </Button>
        </div>
      </header>
      <span role="status" className="sr-only">
        {announce}
      </span>

      <main className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {product ? (
          <ProductView
            key={product.id}
            tea={product}
            image={image}
            onBack={() => openProduct(null)}
            onOpen={openProduct}
            onAdd={(qty) => {
              add(product.id, qty);
              openCart();
            }}
            justAdded={justAdded}
            onQuickAdd={add}
          />
        ) : (
          <>
            <Hero
              image={image}
              onAdd={() => add("yukimuro")}
              onOpen={() => openProduct("yukimuro")}
              added={justAdded === "yukimuro"}
            />

            <section id="teas" aria-labelledby="tea-shop-all" className="mt-14 scroll-mt-20">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div>
                  <h2
                    id="tea-shop-all"
                    className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]"
                  >
                    All teas
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    From eleven farms, from Niigata to Kagoshima. Roasted on Mondays, shipped on Tuesdays.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {filtered ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setFilters({ type: [], harvest: [], price: [] });
                        setQuery("");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null}
                  <span aria-live="polite" className="tabular-nums">
                    {shown.length} of {TEAS.length} teas
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 border-y border-border py-3 lg:flex-row lg:flex-wrap lg:gap-x-8">
                {GROUPS.map((group) => (
                  <div
                    key={group.key}
                    role="group"
                    aria-label={group.label}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span className="w-14 shrink-0 text-[13px] text-muted-foreground lg:w-auto">{group.label}</span>
                    <div className="-me-4 flex min-w-0 gap-1.5 overflow-x-auto py-1 pe-4 [scrollbar-width:none] sm:me-0 sm:flex-wrap sm:pe-0 [&::-webkit-scrollbar]:hidden">
                      {group.options.map((option) => (
                        <Chip
                          key={option}
                          selected={filters[group.key].includes(option)}
                          onSelectedChange={(on) => toggle(group.key, option, on)}
                        >
                          {option}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {shown.length > 0 ? (
                <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
                  {shown.map((tea) => (
                    <li key={tea.id}>
                      <TeaCard tea={tea} image={image} onOpen={openProduct} onAdd={add} added={justAdded === tea.id} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl bg-muted px-6 py-14 text-center">
                  <p className="font-medium">No teas match those filters</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Try a different harvest or price, or clear the filters to see all twelve.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setFilters({ type: [], harvest: [], price: [] });
                      setQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-8 text-[13px] text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>Yukimi Tea · 3-8 Ōmachi, Murakami, Niigata</p>
          <p>Free shipping in Japan on orders over {yen(FREE_SHIPPING)}</p>
        </div>
      </footer>

      <Drawer isOpen={open} onOpenChange={setOpen} aria-label={order ? "Your receipt" : "Your cart"}>
        {order ? (
          <ReceiptView order={order} onDone={() => setOpen(false)} />
        ) : (
          <CartView
            cart={cart}
            image={image}
            paying={paying}
            onQty={(id, qty) => setCart((list) => list.map((l) => (l.id === id ? { ...l, qty } : l)))}
            onRemove={(id) => setCart((list) => list.filter((l) => l.id !== id))}
            onAddSeasonal={() => add("yukimuro")}
            onPay={pay}
          />
        )}
      </Drawer>
    </div>
  );
}

function TeaImage({
  tea,
  image,
  part,
  className,
}: {
  tea: Tea;
  image?: (key: string) => string | undefined;
  part?: string;
  className?: string;
}) {
  const src = image?.(part ? `${tea.id}:${part}` : tea.id);
  const tinted = part !== "farm";
  return (
    <div className={cn("relative isolate overflow-clip bg-muted", className)}>
      {src ? <img src={src} alt="" draggable={false} className="absolute inset-0 size-full object-cover" /> : null}
      {tinted && TINTS[tea.type].shade ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 mix-blend-multiply"
          style={{ background: TINTS[tea.type].shade }}
        />
      ) : null}
      {tinted ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-80 mix-blend-color"
          style={{ background: TINTS[tea.type].hue }}
        />
      ) : null}
    </div>
  );
}

function AddIcon({ added }: { added: boolean }) {
  return <MorphIcon shapes={morphIcons.plusCheck} shape={added ? "check" : "plus"} />;
}

function TeaCard({
  tea,
  image,
  onOpen,
  onAdd,
  added,
}: {
  tea: Tea;
  image?: (key: string) => string | undefined;
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
  added: boolean;
}) {
  return (
    <article className="group/tea relative flex flex-col rounded-2xl has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring">
      <TeaImage
        tea={tea}
        image={image}
        className="aspect-square rounded-2xl transition-[filter] duration-300 group-hover/tea:brightness-[1.03] dark:group-hover/tea:brightness-110"
      />
      {tea.seasonal || tea.low ? (
        <Badge tone={tea.seasonal ? "brand" : "warning"} size="sm" className="absolute top-3 left-3 shadow-xs">
          {tea.seasonal ? "February release" : "Last few bags"}
        </Badge>
      ) : null}
      <h3 className="mt-3.5 text-[15px] leading-5 font-medium">
        <a
          href={`#${tea.id}`}
          onClick={(event) => {
            event.preventDefault();
            onOpen(tea.id);
          }}
          className="outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {tea.name}
        </a>
      </h3>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{tea.origin}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm tabular-nums">
          <span className="font-medium">{yen(tea.price)}</span>
          <span className="hidden text-muted-foreground sm:inline"> · {tea.grams} g</span>
        </p>
        <Button
          size="sm"
          variant={added ? "soft" : "secondary"}
          aria-label={`Add ${tea.name} to cart`}
          onPress={() => onAdd(tea.id)}
          iconStart={<AddIcon added={added} />}
          className="relative z-10 ps-2.5"
        >
          {added ? "Added" : "Add"}
        </Button>
      </div>
    </article>
  );
}

function Hero({
  image,
  onAdd,
  onOpen,
  added,
}: {
  image?: (key: string) => string | undefined;
  onAdd: () => void;
  onOpen: () => void;
  added: boolean;
}) {
  const tea = teaOf("yukimuro");
  const backdrop = image?.("hero");
  return (
    <section
      aria-labelledby="tea-shop-hero"
      className="relative isolate mt-6 grid overflow-clip rounded-3xl bg-muted md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
    >
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          draggable={false}
          className="absolute inset-0 -z-10 size-full object-cover opacity-50 dark:opacity-25"
        />
      ) : null}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-muted via-muted/80 to-muted/10" />
      <div className="flex flex-col items-start px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
        <Badge tone="brand">February release</Badge>
        <h1
          id="tea-shop-hero"
          className="mt-5 font-display text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl"
        >
          {tea.name}
        </h1>
        <p className="mt-4 max-w-[30rem] text-base/7 text-pretty text-muted-foreground sm:text-lg/8">
          Last spring&apos;s first flush from Murakami, kept since November in a room cooled by four hundred tonnes of
          snow. Calmer and sweeter than the day it was picked.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onPress={onAdd}
            iconStart={<AddIcon added={added} />}
            className="h-9 ps-3 pe-3.5 sm:h-11 sm:ps-4 sm:pe-5"
          >
            {added ? "Added to cart" : `Add to cart · ${yen(tea.price)}`}
          </Button>
          <Button size="lg" variant="ghost" onPress={onOpen} className="h-9 px-3 sm:h-11 sm:px-5">
            How to brew it
          </Button>
        </div>
        <p className="mt-5 text-[13px] text-muted-foreground tabular-nums">
          {tea.grams} g · 70 °C · 60 seconds · 640 bags this year
        </p>
      </div>
      <div className="relative -mt-6 flex min-h-56 items-end justify-center sm:mt-0 sm:min-h-80">
        <Steam
          density={0.4}
          sway={0.25}
          className="absolute bottom-[134px] left-1/2 h-[200px] w-[240px] -translate-x-1/2 [mask-image:radial-gradient(42%_88%_at_50%_100%,#000_45%,transparent)] sm:bottom-[198px] sm:h-[260px] sm:w-[300px]"
        />
        <Cup className="relative mb-6 w-[176px] sm:mb-10 sm:w-[260px]" />
      </div>
    </section>
  );
}

function Cup({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" aria-hidden="true" className={cn("overflow-visible", className)}>
      <defs>
        <linearGradient id="tea-shop-cup-body" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="color-mix(in oklab, var(--card) 70%, var(--muted-foreground))" />
          <stop offset="0.38" stopColor="var(--card)" />
          <stop offset="0.7" stopColor="color-mix(in oklab, var(--card) 92%, var(--muted-foreground))" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--card) 62%, var(--muted-foreground))" />
        </linearGradient>
        <linearGradient id="tea-shop-cup-glaze" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="color-mix(in oklab, var(--brand) 55%, var(--muted-foreground))" />
          <stop offset="0.4" stopColor="color-mix(in oklab, var(--brand) 42%, var(--card))" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--brand) 60%, var(--muted-foreground))" />
        </linearGradient>
        <radialGradient id="tea-shop-cup-tea" cx="0.42" cy="0.4" r="0.7">
          <stop offset="0" stopColor="color-mix(in oklab, var(--chart-4) 55%, var(--chart-2))" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--chart-2) 70%, var(--success))" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="181" rx="70" ry="8" className="fill-foreground/12 dark:fill-black/40" />
      <path
        d="M48 64C49 112 52 146 61 164C66 174 84 179 110 179C136 179 154 174 159 164C168 146 171 112 172 64Z"
        fill="url(#tea-shop-cup-body)"
      />
      <path
        d="M48 64H172L171.6 96C162 102 152 93 140 99C128 105 118 95 106 101C94 107 82 97 70 102C60 106 54 100 48.5 98Z"
        fill="url(#tea-shop-cup-glaze)"
      />
      <path
        d="M64 168C70 175 88 178 110 178C132 178 150 175 156 168"
        fill="none"
        strokeWidth="1"
        className="stroke-foreground/15"
      />
      <ellipse cx="110" cy="64" rx="62" ry="13" className="fill-[color-mix(in_oklab,var(--brand)_45%,var(--card))]" />
      <ellipse
        cx="110"
        cy="65.5"
        rx="57"
        ry="10.5"
        className="fill-[color-mix(in_oklab,var(--card)_85%,var(--muted-foreground))]"
      />
      <ellipse cx="110" cy="68" rx="54" ry="8.2" fill="url(#tea-shop-cup-tea)" />
      <ellipse cx="96" cy="66.5" rx="18" ry="2.2" className="fill-white/35" />
      <path
        d="M58 104C59 130 62 148 68 160"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-white/40 dark:stroke-white/15"
      />
    </svg>
  );
}

function ProductView({
  tea,
  image,
  onBack,
  onOpen,
  onAdd,
  onQuickAdd,
  justAdded,
}: {
  tea: Tea;
  image?: (key: string) => string | undefined;
  onBack: () => void;
  onOpen: (id: string) => void;
  onAdd: (qty: number) => void;
  onQuickAdd: (id: string) => void;
  justAdded: string | null;
}) {
  const [shot, setShot] = useState(0);
  const [qty, setQty] = useState(1);
  const shots = [
    { part: undefined, label: "The leaf" },
    { part: "farm", label: `The garden at ${tea.origin.split(",")[0]}` },
    { part: "liquor", label: "In the cup" },
  ];
  const more = [
    ...TEAS.filter((t) => t.id !== tea.id && t.type === tea.type),
    ...TEAS.filter((t) => t.type !== tea.type),
  ].slice(0, 4);

  return (
    <div className="pt-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <button
          type="button"
          onClick={onBack}
          className="-ms-1.5 inline-flex h-8 items-center gap-1 rounded-md ps-1 pe-2 outline-none transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          All teas
        </button>
        <span aria-hidden="true">/</span>
        <span>{tea.type}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="truncate text-foreground">
          {tea.name}
        </span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div className="flex flex-col gap-3 lg:sticky lg:top-24">
            <div className="relative">
              {shots.map((s, i) => (
                <TeaImage
                  key={i}
                  tea={tea}
                  image={image}
                  part={s.part}
                  className={cn(
                    "aspect-square rounded-3xl transition-opacity duration-300 ease-settle sm:aspect-[5/4]",
                    i === shot ? "relative opacity-100" : "absolute inset-0 opacity-0",
                  )}
                />
              ))}
              {tea.seasonal ? (
                <Badge tone="brand" className="absolute top-4 left-4 shadow-xs">
                  February release
                </Badge>
              ) : null}
            </div>
            <div role="group" aria-label="Pictures" className="grid grid-cols-3 gap-3">
              {shots.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Show picture ${i + 1} of 3: ${s.label}`}
                  aria-pressed={i === shot}
                  onClick={() => setShot(i)}
                  className={cn(
                    "group/thumb flex flex-col gap-1.5 rounded-xl text-start outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  )}
                >
                  <TeaImage
                    tea={tea}
                    image={image}
                    part={s.part}
                    className={cn(
                      "aspect-[4/3] w-full rounded-xl outline-offset-2 transition-[outline-color,opacity] duration-200",
                      i === shot
                        ? "outline-2 outline-brand"
                        : "outline-2 outline-transparent opacity-75 group-hover/thumb:opacity-100",
                    )}
                  />
                  <span className={cn("truncate text-xs", i === shot ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="text-[13px] text-muted-foreground">
            {tea.origin} · {tea.harvest}
          </p>
          <h1 className="mt-2 font-display text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] sm:text-5xl">
            {tea.name}
          </h1>
          <p className="mt-4 flex items-baseline gap-2 tabular-nums">
            <span className="font-display text-2xl font-semibold tracking-[-0.02em]">{yen(tea.price)}</span>
            <span className="text-sm text-muted-foreground">for {tea.grams} g, tax included</span>
          </p>
          <p className="mt-5 text-base/7 text-pretty text-foreground/85">{tea.description}</p>
          <ul aria-label="Tasting notes" className="mt-5 flex flex-wrap gap-1.5">
            {tea.notes.map((note) => (
              <li key={note}>
                <Badge>{note}</Badge>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex items-end gap-3 border-t border-border pt-6">
            <NumberField
              label="Quantity"
              minValue={1}
              maxValue={12}
              value={qty}
              onChange={(v) => setQty(Number.isNaN(v) ? 1 : v)}
              size="lg"
              className="w-32 shrink-0"
            />
            <Button size="lg" onPress={() => onAdd(qty)} className="min-w-0 flex-1">
              Add to cart · {yen(tea.price * qty)}
            </Button>
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Roasted on Monday, posted on Tuesday 16 February. Free shipping over {yen(FREE_SHIPPING)}.
          </p>

          <BrewingGuide tea={tea} />
        </div>
      </div>

      <section aria-labelledby="tea-shop-more" className="mt-20">
        <h2 id="tea-shop-more" className="font-display text-xl font-semibold tracking-[-0.02em]">
          {more.filter((t) => t.type === tea.type).length > 0
            ? `More ${tea.type.toLowerCase()}`
            : "You might also like"}
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-4">
          {more.map((t) => (
            <li key={t.id}>
              <TeaCard tea={t} image={image} onOpen={onOpen} onAdd={onQuickAdd} added={justAdded === t.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BrewingGuide({ tea }: { tea: Tea }) {
  const [temp, setTemp] = useState(tea.temp);
  const [timer, setTimer] = useState<{ start: number; end: number } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t >= timer.end) window.clearInterval(id);
    }, 100);
    return () => window.clearInterval(id);
  }, [timer]);

  const diff = temp - tea.temp;
  const hint =
    diff <= -8
      ? "Well below how we brew it. A soft, brothy cup; let it steep a little longer."
      : diff <= -3
        ? "A little cool: sweeter and gentler, with less bite."
        : diff < 3
          ? "This is how we brew it in the shop."
          : diff < 8
            ? "A little hot: brighter and more astringent. Shorten the steep."
            : "Too hot for this leaf. It will turn bitter within seconds.";

  const total = tea.seconds * 1000;
  const left = timer ? Math.max(0, timer.end - now) : total;
  const done = timer != null && left === 0;
  const running = timer != null && !done;
  const shown = Math.ceil(left / 1000);
  const verb = tea.type === "Matcha" ? "Whisk" : "Steep";

  return (
    <section
      aria-labelledby="tea-shop-brew"
      className="mt-10 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="tea-shop-brew" className="font-display text-xl font-semibold tracking-[-0.02em]">
          How to brew it
        </h2>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Ours: {tea.temp} °C, {steep(tea.seconds)}
        </p>
      </div>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <DialThermostat
          aria-label="Water temperature"
          minValue={40}
          maxValue={100}
          value={temp}
          onChange={(v) => setTemp(v as number)}
          size={186}
          className="shrink-0"
        />
        <div className="flex w-full min-w-0 flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Leaf", `${tea.leaf} g`],
              ["Water", `${tea.water} ml`],
              [verb, steep(tea.seconds)],
              ["Infusions", tea.infusions === 1 ? "One bowl" : `${tea.infusions}`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[13px] text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p aria-live="polite" className="text-[13px]/5 text-pretty text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{temp} °C.</span> {hint}
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <Button
          variant={running ? "secondary" : "soft"}
          size="sm"
          iconStart={<Timer />}
          onPress={() => {
            if (running) {
              setTimer(null);
              return;
            }
            const t = performance.now();
            setNow(t);
            setTimer({ start: t, end: t + total });
          }}
        >
          {running ? "Stop" : done ? "Time it again" : `Start a ${steep(tea.seconds)} timer`}
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border">
            <span
              className="absolute inset-0 origin-left rounded-full bg-brand transition-transform duration-100 ease-linear"
              style={{ transform: `scaleX(${timer ? 1 - left / total : 0})` } as CSSProperties}
            />
          </span>
          <span
            role="timer"
            aria-live={done ? "polite" : "off"}
            className={cn(
              "w-16 shrink-0 text-end text-sm tabular-nums",
              done ? "font-medium text-brand-strong" : "text-muted-foreground",
            )}
          >
            {done ? "Pour now" : `${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, "0")}`}
          </span>
        </div>
      </div>
    </section>
  );
}

function CartView({
  cart,
  image,
  paying,
  onQty,
  onRemove,
  onAddSeasonal,
  onPay,
}: {
  cart: Line[];
  image?: (key: string) => string | undefined;
  paying: boolean;
  onQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onAddSeasonal: () => void;
  onPay: () => void;
}) {
  const { subtotal, shipping, total } = totals(cart);
  const count = cart.reduce((sum, l) => sum + l.qty, 0);
  const tax8 = Math.floor((subtotal * 8) / 108);
  const tax10 = Math.floor((shipping * 10) / 110);
  const toFree = Math.max(0, FREE_SHIPPING - subtotal);

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Your cart</DrawerTitle>
        <p className="text-[13px] text-muted-foreground">
          {count === 0 ? "Nothing here yet" : `${count} ${count === 1 ? "bag" : "bags"} · posted Tuesday 16 February`}
        </p>
      </DrawerHeader>
      <DrawerBody>
        {cart.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">
              Your cart is empty. This month we are drinking the Yukimuro sencha, opened from the snow room last week.
            </p>
            <Button variant="secondary" size="sm" onPress={onAddSeasonal}>
              Add Yukimuro sencha · {yen(teaOf("yukimuro").price)}
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {cart.map((line) => {
              const tea = teaOf(line.id);
              return (
                <li key={line.id} className="flex gap-3 py-4 first:pt-2">
                  <TeaImage tea={tea} image={image} className="size-16 shrink-0 rounded-lg" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{tea.name}</p>
                        <p className="text-[13px] text-muted-foreground tabular-nums">
                          {tea.grams} g · {yen(tea.price)} each
                        </p>
                      </div>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${tea.name}`}
                        onPress={() => onRemove(line.id)}
                        className="-me-1.5 -mt-1 size-7 text-muted-foreground data-[hovered]:text-foreground"
                      >
                        <X />
                      </IconButton>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <NumberField
                        aria-label={`Quantity of ${tea.name}`}
                        minValue={1}
                        maxValue={12}
                        value={line.qty}
                        onChange={(v) => onQty(line.id, Number.isNaN(v) ? 1 : v)}
                        size="sm"
                        className="w-[6.5rem]"
                      />
                      <p className="text-sm font-medium tabular-nums">{yen(tea.price * line.qty)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DrawerBody>
      {cart.length > 0 ? (
        <DrawerFooter className="flex-col items-stretch gap-0 border-t border-border">
          <div className="mb-4 flex flex-col gap-2">
            <p className="text-[13px] text-muted-foreground tabular-nums">
              {toFree > 0 ? `Add ${yen(toFree)} more for free shipping` : "Your order ships free"}
            </p>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border">
              <span
                className="absolute inset-0 origin-left rounded-full bg-brand transition-transform duration-300 ease-settle"
                style={{ transform: `scaleX(${Math.min(1, subtotal / FREE_SHIPPING)})` }}
              />
            </span>
          </div>
          <dl className="flex flex-col gap-1.5 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{yen(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{shipping ? yen(shipping) : "Free"}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-2.5 text-base font-semibold">
              <dt>Total</dt>
              <dd>{yen(total)}</dd>
            </div>
          </dl>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            Includes {yen(tax8)} tax at 8% on tea{tax10 ? ` and ${yen(tax10)} at 10% on shipping` : ""}.
          </p>
          <Button size="lg" isPending={paying} onPress={onPay} className="mt-4 w-full">
            Pay {yen(total)}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Charged to the card ending {CARD}</p>
        </DrawerFooter>
      ) : null}
    </>
  );
}

function ReceiptView({ order, onDone }: { order: Order; onDone: () => void }) {
  const receipt = useRef<ReceiptCardHandle>(null);
  const tax8 = Math.floor((order.subtotal * 8) / 108);
  const tax10 = Math.floor((order.shipping * 10) / 110);
  const lines: ReceiptLine[] = [
    ...order.lines.map((l) => {
      const tea = teaOf(l.id);
      return { label: `${tea.name}${l.qty > 1 ? ` × ${l.qty}` : ""}`, value: yen(tea.price * l.qty) };
    }),
    { label: "Subtotal", value: yen(order.subtotal), rule: true },
    { label: "Shipping", value: order.shipping ? yen(order.shipping) : "Free" },
    { label: "Total", value: yen(order.total), bold: true, rule: true },
    { label: "Of which tax 8%", value: yen(tax8) },
    ...(tax10 ? [{ label: "Of which tax 10%", value: yen(tax10) }] : []),
    { label: `Card ending ${CARD}`, value: yen(order.total), rule: true },
  ];

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Thank you, it&apos;s ordered</DrawerTitle>
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Order {order.number}. We roast on Monday and post on Tuesday 16 February.
        </p>
      </DrawerHeader>
      <DrawerBody className="flex justify-center pt-4">
        <ReceiptCard
          ref={receipt}
          aria-label={`Receipt for order ${order.number}`}
          title={
            <>
              Yukimi Tea
              <span className="block text-xs font-normal opacity-75 tabular-nums">Murakami · 13 Feb 2027, 15:42</span>
            </>
          }
          lines={lines}
          footer="Roasted on Monday 15 February. Thank you."
          code={order.code}
        />
      </DrawerBody>
      <DrawerFooter>
        <Button variant="secondary" onPress={() => receipt.current?.print()}>
          Print again
        </Button>
        <Button onPress={onDone}>Continue shopping</Button>
      </DrawerFooter>
    </>
  );
}

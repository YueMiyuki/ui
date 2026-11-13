"use client";

import { Eye, Receipt, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Badge } from "@/components/miyuki-ui/badge";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/miyuki-ui/data-table";
import { createRng } from "@/components/miyuki-ui/lib/prng";

type Status = "Active" | "Trial" | "Past due" | "Cancelled";

interface Customer {
  id: string;
  name: string;
  prefecture: string;
  plan: "Valley" | "Ridge" | "Summit";
  status: Status;
  minutes: number;
  amount: number;
  seats: number;
}

const businesses: Record<string, [string, string[]]> = {
  Otaru: ["Hokkaido", ["Canal Ryokan", "Glassworks", "Harbour Tours", "Ferry Co."]],
  Hakuba: ["Nagano", ["Mountain Guides", "Ski School", "Alpine Club", "Powder Lodge"]],
  Nozawa: ["Nagano", ["Onsen Inn", "Ski School", "Snow Lodge"]],
  Niseko: ["Hokkaido", ["Backcountry Guides", "Ski School", "Snow Lodge", "Cat Skiing"]],
  Shirakawa: ["Gifu", ["Farmhouse Inn", "Heritage Tours"]],
  Aomori: ["Aomori", ["Fishing Co-op", "Ferry Co.", "Apple Growers", "Snow Corridor Tours"]],
  Tōya: ["Hokkaido", ["Lakeside Hotel", "Volcano Observatory", "Boat Club"]],
  Kiso: ["Nagano", ["Valley Rail", "Post Town Inn", "Forestry Co-op"]],
  Matsumoto: ["Nagano", ["Alpine Club", "Castle Tours", "Rail Tours"]],
  Yakushima: ["Kagoshima", ["Forest Guides", "Ferry Co.", "Trail Huts"]],
  Furano: ["Hokkaido", ["Ski School", "Farm Stay", "Ropeway"]],
  Zaō: ["Yamagata", ["Ropeway", "Onsen Inn", "Snow Monster Tours"]],
  Myōkō: ["Niigata", ["Snow Lodge", "Mountain Guides"]],
  Kushiro: ["Hokkaido", ["Fishing Co-op", "Wetland Tours", "Crane Lodge"]],
  Asahidake: ["Hokkaido", ["Ropeway", "Mountain Guides"]],
  Rishiri: ["Hokkaido", ["Ferry Co.", "Kelp Co-op"]],
};

const perSeat = { Valley: 1_600, Ridge: 2_400, Summit: 2_100 };
const rng = createRng("customers");
const statuses: Status[] = [
  "Active",
  "Active",
  "Active",
  "Active",
  "Active",
  "Active",
  "Trial",
  "Trial",
  "Past due",
  "Cancelled",
];
const since: Record<Status, [number, number]> = {
  Active: [2, 4_200],
  Trial: [30, 9_000],
  "Past due": [2_000, 30_000],
  Cancelled: [40_000, 130_000],
};

const customers: Customer[] = rng
  .shuffle(
    Object.entries(businesses).flatMap(([place, [prefecture, kinds]]) =>
      kinds.map((kind) => ({ place, prefecture, kind })),
    ),
  )
  .slice(0, 48)
  .map(({ place, prefecture, kind }, i) => {
    const plan = rng.pick(["Valley", "Valley", "Ridge", "Ridge", "Ridge", "Summit"] as const);
    const status = rng.pick(statuses);
    const seats = plan === "Valley" ? rng.int(1, 5) : plan === "Ridge" ? rng.int(3, 24) : rng.int(20, 120);
    return {
      id: `c${i + 1}`,
      name: `${place} ${kind}`,
      prefecture,
      plan,
      status,
      seats,
      minutes: rng.int(...since[status]),
      amount: perSeat[plan] * seats,
    };
  });

const tones = { Active: "success", Trial: "brand", "Past due": "warning", Cancelled: "neutral" } as const;

function ago(minutes: number) {
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"} ago`;
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} hr ago`;
  if (minutes < 2_880) return "Yesterday";
  if (minutes < 10_080) return unit(Math.round(minutes / 1_440), "day");
  if (minutes < 43_200) return unit(Math.round(minutes / 10_080), "week");
  return unit(Math.round(minutes / 43_200), "month");
}

const yen = new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY" });

const columns: DataTableColumn<Customer>[] = [
  {
    id: "name",
    header: "Customer",
    isRowHeader: true,
    sortable: true,
    value: (c) => c.name,
    cell: (c) => (
      <span className="flex items-center gap-3">
        <Avatar name={c.name} shape="rounded" aria-hidden="true" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="truncate text-[13px] font-normal text-muted-foreground">{c.prefecture}</span>
        </span>
      </span>
    ),
  },
  { id: "plan", header: "Plan", sortable: true, value: (c) => c.plan },
  {
    id: "status",
    header: "Status",
    value: (c) => c.status,
    cell: (c) => (
      <Badge tone={tones[c.status]} size="sm" dot>
        {c.status}
      </Badge>
    ),
  },
  { id: "seats", header: "Seats", align: "end", sortable: true, defaultHidden: true, value: (c) => c.seats },
  {
    id: "active",
    header: "Last active",
    sortable: true,
    value: (c) => c.minutes,
    cell: (c) => <span className="text-muted-foreground">{ago(c.minutes)}</span>,
  },
  {
    id: "amount",
    header: "Amount",
    align: "end",
    sortable: true,
    value: (c) => c.amount,
    cell: (c) => yen.format(c.amount),
  },
];

const filters: DataTableFilter<Customer>[] = [
  {
    id: "status",
    label: "Status",
    allLabel: "All statuses",
    value: (c) => c.status,
    options: (Object.keys(tones) as Status[]).map((s) => ({ id: s, label: s, tone: tones[s] })),
  },
];

export default function DataTableDemo() {
  const [rows, setRows] = useState(customers);

  return (
    <DataTable
      className="max-w-4xl"
      columns={columns}
      rows={rows}
      searchKeys={["name", "prefecture"]}
      filters={filters}
      noun={["customer", "customers"]}
      description="Forecast subscriptions billed monthly."
      rowActions={[
        { id: "view", label: "View account", icon: <Eye /> },
        { id: "invoice", label: "Send invoice", icon: <Receipt /> },
        { id: "delete", label: "Delete", icon: <Trash2 />, tone: "destructive" },
      ]}
      onAction={(action, picked) => {
        if (action === "delete") setRows((list) => list.filter((row) => !picked.includes(row)));
      }}
    />
  );
}

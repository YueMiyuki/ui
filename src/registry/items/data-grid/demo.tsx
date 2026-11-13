"use client";

import { useState } from "react";
import { DataGrid, type DataGridColumn } from "@/components/miyuki-ui/data-grid";
import { createRng } from "@/components/miyuki-ui/lib/prng";
import { people } from "@/registry/lib/data";

const places: [string, string][] = [
  ["Otaru", "Hokkaido"],
  ["Niseko", "Hokkaido"],
  ["Furano", "Hokkaido"],
  ["Asahidake", "Hokkaido"],
  ["Kushiro", "Hokkaido"],
  ["Tōya", "Hokkaido"],
  ["Aomori", "Tōhoku"],
  ["Zaō", "Tōhoku"],
  ["Hachimantai", "Tōhoku"],
  ["Hakuba", "Chūbu"],
  ["Nozawa", "Chūbu"],
  ["Matsumoto", "Chūbu"],
  ["Kiso", "Chūbu"],
  ["Myōkō", "Chūbu"],
  ["Shirakawa", "Chūbu"],
  ["Minakami", "Kantō"],
  ["Nikkō", "Kantō"],
  ["Hira", "Kansai"],
  ["Yakushima", "Kyūshū"],
  ["Aso", "Kyūshū"],
];
const kinds = [
  "Mountain Guides",
  "Outfitters",
  "Ryokan",
  "Onsen Inn",
  "Tourism Office",
  "Alpine Club",
  "Lodge",
  "Hut Association",
  "Field Station",
];
const owners = people.slice(0, 8).map((p) => p.name);

const columns: DataGridColumn[] = [
  { id: "account", name: "Account", type: "text", width: 212 },
  { id: "owner", name: "Owner", type: "select", width: 150, options: owners },
  {
    id: "region",
    name: "Region",
    type: "select",
    width: 128,
    options: ["Hokkaido", "Tōhoku", "Kantō", "Chūbu", "Kansai", "Kyūshū"],
  },
  {
    id: "stage",
    name: "Stage",
    type: "status",
    width: 122,
    options: [
      { value: "Lead", tone: "neutral" },
      { value: "Trial", tone: "brand" },
      { value: "Proposal", tone: "warning" },
      { value: "Won", tone: "success" },
      { value: "Lost", tone: "destructive" },
    ],
  },
  { id: "seats", name: "Seats", type: "number", width: 88 },
  {
    id: "value",
    name: "Annual value",
    type: "number",
    width: 136,
    format: new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY" }).format,
  },
];

const rng = createRng("accounts");
const accounts = rng
  .shuffle(places.flatMap(([place, region]) => kinds.map((kind) => ({ account: `${place} ${kind}`, region }))))
  .slice(0, 60)
  .map((row) => {
    const seats = rng.int(3, 160);
    return {
      ...row,
      owner: rng.pick(owners),
      stage: rng.pick(["Lead", "Trial", "Trial", "Proposal", "Won", "Won", "Won", "Lost"]),
      seats,
      value: Math.round((seats * rng.int(120, 180) * 100) / 1000) * 1000,
    };
  });

export default function DataGridDemo() {
  const [rows, setRows] = useState(accounts);

  return (
    <div className="size-full p-4 sm:p-6">
      <DataGrid aria-label="Accounts" className="h-full" columns={columns} rows={rows} onChange={setRows} />
    </div>
  );
}

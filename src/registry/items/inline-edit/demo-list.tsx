"use client";

import { InlineEdit } from "@/components/miyuki-ui/inline-edit";

const routes = [
  { id: "happo", name: "Happo-one ridge loop", detail: "11.4 km · 1,082 m of climbing" },
  { id: "tsugaike", name: "Tsugaike to the Hakuba-oike hut", detail: "8.9 km · 914 m of climbing" },
  { id: "kiso", name: "Tsumago to Magome", detail: "7.8 km · 296 m · shared by the Kitakaze club", locked: true },
  { id: "toya", name: "Lake Tōya shore path", detail: "14.2 km · 138 m of climbing" },
  { id: "otaru", name: "Otaru canal and the old Temiya line", detail: "5.6 km · 64 m of climbing" },
];

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function rename(locked: boolean) {
  await pause(800);
  if (locked) throw new Error("Only the club can rename a shared route. Ask Lars to change it.");
}

export default function InlineEditListDemo() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg leading-7 font-semibold tracking-tight text-foreground">Saved routes</h3>
        <p className="text-sm text-muted-foreground">Click a name to rename it. Enter saves, Escape puts it back.</p>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
        {routes.map((route) => (
          <li key={route.id} className="flex flex-col gap-1 px-4 py-3">
            <InlineEdit
              label={`name of ${route.name}`}
              placeholder="Name this route"
              defaultValue={route.name}
              showButtons
              validate={(value) => (value.trim() ? true : "A route needs a name.")}
              onSave={() => rename(Boolean(route.locked))}
              className="text-sm font-medium text-foreground"
            />
            <span className="text-[13px] text-muted-foreground">{route.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

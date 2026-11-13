"use client";

import { HoverNote } from "@/components/miyuki-ui/hover-note";
import { avatar, landscape } from "@/registry/lib/art";

const departures = [
  { time: "06:12", kind: "Rapid", arrives: "06:46" },
  { time: "06:31", kind: "Local", arrives: "07:19" },
  { time: "06:58", kind: "Rapid", arrives: "07:32" },
];

export default function HoverNoteDemo() {
  return (
    <p className="max-w-xl text-base leading-8 text-pretty text-foreground">
      We caught{" "}
      <HoverNote
        content={
          <>
            <p className="font-medium">Sapporo to Otaru</p>
            <p className="text-[13px] text-muted-foreground">Hakodate line, platform 5</p>
            <ul className="mt-2.5 space-y-0.5 text-[13px] tabular-nums">
              {departures.map((d) => (
                <li
                  key={d.time}
                  className={
                    d.time === "06:12"
                      ? "flex items-center justify-between rounded-md bg-brand-soft px-2 py-1"
                      : "flex items-center justify-between px-2 py-1"
                  }
                >
                  <span className="font-medium">{d.time}</span>
                  <span className="text-muted-foreground">{d.kind}</span>
                  <span>arr. {d.arrives}</span>
                </li>
              ))}
            </ul>
          </>
        }
      >
        the 06:12 train
      </HoverNote>{" "}
      out of Sapporo and had{" "}
      <HoverNote
        containerClassName="p-1.5"
        content={
          <>
            <img
              src={landscape("otaru", { mood: "dusk", width: 560, height: 280 })}
              alt=""
              className="aspect-[2/1] w-full rounded-md object-cover"
            />
            <div className="px-1.5 pt-2.5 pb-1.5">
              <p className="font-medium">Otaru</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
                A canal town of stone warehouses and glass workshops, lamplit from 16:15.
              </p>
            </div>
          </>
        }
      >
        Otaru
      </HoverNote>{" "}
      almost to ourselves before the glass shops opened. By nine,{" "}
      <HoverNote
        content={
          <>
            <div className="flex items-center gap-3">
              <img src={avatar("haruka.mori", 80)} alt="" className="size-10 rounded-full" />
              <div className="min-w-0">
                <p className="font-medium">Haruka Mori</p>
                <p className="text-[13px] text-muted-foreground">Coast guide, Kitakaze Outfitters</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Has walked the cliff path from Otaru to Shukutsu more than two hundred times, mostly in snow.
            </p>
          </>
        }
      >
        Haruka Mori
      </HoverNote>{" "}
      was waiting by the canal with a thermos of tea and a route along the coast we would never have found alone.
    </p>
  );
}

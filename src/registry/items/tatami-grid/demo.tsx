"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { MorphIcon } from "@/components/miyuki-ui/path-morph";
import { TatamiGrid, TatamiMat, type TatamiSpan } from "@/components/miyuki-ui/tatami-grid";
import { landscape, type Mood } from "@/registry/lib/art";

interface Bath {
  id: string;
  mood: Mood;
  town: string;
  bath: string;
  temp: number;
  span: TatamiSpan;
}

const baths: Bath[] = [
  { id: "nozawa", mood: "snow", town: "Nozawa", bath: "Ōyu bathhouse", temp: 42, span: "full" },
  { id: "hakuba", mood: "day", town: "Hakuba", bath: "Kurabu no yu", temp: 40, span: "full" },
  { id: "toya", mood: "dawn", town: "Lake Tōya", bath: "Lakeside footbath", temp: 41, span: "full" },
  { id: "niseko", mood: "snow", town: "Niseko", bath: "Goshiki", temp: 39, span: "full" },
  { id: "shirakawa", mood: "dusk", town: "Shirakawa", bath: "Shiramizu no yu", temp: 43, span: "full" },
  { id: "aomori", mood: "day", town: "Aomori", bath: "Sukayu", temp: 46, span: "full" },
  { id: "kiso", mood: "snow", town: "Kiso", bath: "Kiso-Fukushima", temp: 38, span: "half" },
  { id: "matsumoto", mood: "dawn", town: "Matsumoto", bath: "Utsukushigahara", temp: 41, span: "full" },
  { id: "yakushima", mood: "day", town: "Yakushima", bath: "Hirauchi kaichū", temp: 44, span: "half" },
  { id: "otaru", mood: "snow", town: "Otaru", bath: "Asarigawa", temp: 40, span: "full" },
];

const sizes = {
  half: "M8.5 8.5L15.5 8.5L15.5 15.5L8.5 15.5Z",
  full: "M3.5 8.5L20.5 8.5L20.5 15.5L3.5 15.5Z",
};

const control =
  "inline-grid size-6 cursor-default place-items-center rounded-md bg-card/80 text-muted-foreground outline-none backdrop-blur-sm transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-3.5";

export default function TatamiGridDemo() {
  const [room, setRoom] = useState(() => baths.slice(0, 6));
  const addRef = useRef<HTMLButtonElement>(null);
  const spare = baths.filter((b) => !room.some((r) => r.id === b.id));

  return (
    <div className="w-full max-w-xl">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.01em]">A six-mat room</h3>
          <p className="text-[13px] text-muted-foreground">One bath to a mat. No four corners meet.</p>
        </div>
        <Button
          ref={addRef}
          variant="secondary"
          size="sm"
          iconStart={<Plus />}
          isDisabled={spare.length === 0}
          onPress={() => setRoom((r) => [...r, spare[0]])}
        >
          Add a mat
        </Button>
      </div>
      <TatamiGrid columns={4}>
        {room.map((bath) => (
          <TatamiMat key={bath.id} span={bath.span}>
            <div className="flex size-full gap-2.5 group-data-[shape=tall]/tatami:flex-col">
              <img
                src={landscape(bath.id, { mood: bath.mood, width: 240, height: 240 })}
                alt=""
                draggable={false}
                className="aspect-square shrink-0 rounded-[3px] object-cover group-data-[shape=square]/tatami:hidden group-data-[shape=tall]/tatami:w-full group-data-[shape=wide]/tatami:h-full"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-end">
                <p className="font-display text-2xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
                  {bath.temp}°
                </p>
                <p className="mt-1.5 truncate text-[13px] font-medium">{bath.town}</p>
                <p className="truncate text-xs text-muted-foreground">{bath.bath}</p>
              </div>
            </div>
            <div className="absolute -top-1 -right-0.5 flex gap-0.5 opacity-100 transition-opacity duration-150 group-focus-within/tatami:opacity-100 group-hover/tatami:opacity-100 [@media(hover:hover)]:opacity-0">
              <button
                type="button"
                className={control}
                aria-label={bath.span === "full" ? `Make ${bath.town} a half mat` : `Make ${bath.town} a full mat`}
                onClick={() =>
                  setRoom((r) =>
                    r.map((b) => (b.id === bath.id ? { ...b, span: b.span === "full" ? "half" : "full" } : b)),
                  )
                }
              >
                <MorphIcon shapes={sizes} shape={bath.span === "full" ? "half" : "full"} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={control}
                aria-label={`Remove ${bath.town}`}
                onClick={() => {
                  setRoom((r) => r.filter((b) => b.id !== bath.id));
                  addRef.current?.focus();
                }}
              >
                <X />
              </button>
            </div>
          </TatamiMat>
        ))}
      </TatamiGrid>
    </div>
  );
}

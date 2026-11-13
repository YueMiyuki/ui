"use client";

import { BrushAnnotation } from "@/components/miyuki-ui/brush-annotation";
import { FieldNotes, Figure, Note } from "@/components/miyuki-ui/field-notes";
import { landscape } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const aiko = people.find((p) => p.name === "Aiko Tanaka")!;

export default function FieldNotesDemo() {
  return (
    <div className="w-full px-6 pt-14 pb-24 sm:px-8">
      <FieldNotes>
        <header>
          <p className="text-sm text-muted-foreground">Field notes, 17 February</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-foreground">
            Over Tokugō Pass in February
          </h1>
          <div className="mt-5 flex items-center gap-3 text-sm">
            <img src={aiko.avatar} alt="" className="size-8 rounded-full bg-muted object-cover" />
            <span>
              <span className="font-medium text-foreground">{aiko.name}</span>
              <span className="text-muted-foreground"> · {aiko.role} · 4 min read</span>
            </span>
          </div>
        </header>
        <p>
          We left{" "}
          <Note note="The winter bus from Shin-Shimashima station turns round at the bridge. The last one back leaves at 17:20.">
            Shimashima
          </Note>{" "}
          at first light, while the road was still hard enough to walk without snowshoes. The old forestry track up the
          valley ran white and empty as far as we could see, and by eight the sun was on the ridge above us.
        </p>
        <p>
          At{" "}
          <Note note="A campsite in summer. In February only the roof of the toilet block shows above the snow.">
            Iwanadome
          </Note>{" "}
          a stone marker, half buried, points up into the cedar, and the trail leaves the valley floor to climb for two
          hours on the north side of the stream.{" "}
          <BrushAnnotation kind="underline" color="var(--brand)">
            The snow was deep and dry in the shade
          </BrushAnnotation>
          , and we took turns breaking trail, ten minutes each, counting steps to keep from looking up.
        </p>
        <p>
          Near the top the forest thins to stunted birch and the angle eases. We reached the hut a little after one and
          found{" "}
          <Note note="Sleeps six on boards. Leave ¥1,000 in the tin by the stove, and the shovel where you found it.">
            the winter room
          </Note>{" "}
          already dug out by a party the day before. Tea, a dry pair of gloves, and then the last hundred metres to the
          col.
        </p>
        <Figure
          src={landscape("tokugo-hotaka", { mood: "snow", width: 1400, height: 700 })}
          alt="Snow-covered peaks across a valley under low cloud"
          caption="Hotaka from the col at 13:40. The cloud lifted for about twenty minutes, then closed again for the rest of the day."
        />
        <p>
          And then the whole of Hotaka at once, across the Azusa valley: the wall of rock and ice we had walked toward
          for two days without seeing. We stood at{" "}
          <Note
            mark="circle"
            markColor="var(--brand)"
            note="The col itself. The signpost was buried to its last board, so we dug it out for the photograph."
          >
            2,135 metres
          </Note>{" "}
          and nobody said much. We ate standing up, took the photographs everyone takes, and started down before the
          light went.
        </p>
        <p>
          The descent is a hundred zig-zags through larch to the river. Kamikochi in winter is a village with its doors
          shut:{" "}
          <BrushAnnotation kind="highlight" color="var(--chart-2)">
            no buses, no shops, no one at the bridge
          </BrushAnnotation>
          , only the river loud under the ice and our own tracks going on ahead of us to the tunnel.
        </p>
      </FieldNotes>
    </div>
  );
}

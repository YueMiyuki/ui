"use client";

import { LinkPeek } from "@/components/miyuki-ui/link-peek";
import { landscape } from "@/registry/lib/art";

export default function LinkPeekDemo() {
  return (
    <p className="max-w-xl pt-44 text-base leading-7 text-pretty text-foreground">
      The winter loop starts with{" "}
      <LinkPeek
        href="https://kitakaze.example/routes/otaru-canal-walk"
        preview={{
          image: landscape("otaru-canal", { width: 480, height: 300, mood: "dusk" }),
          title: "Otaru canal walk",
          description: "1.4 km of stone warehouses and gas lamps, best after 17:00.",
        }}
      >
        the Otaru canal walk
      </LinkPeek>{" "}
      on the first evening, then three days of touring on{" "}
      <LinkPeek
        href="https://kitakaze.example/routes/hakuba-north-ridge"
        preview={{
          image: landscape("hakuba-ridge", { width: 480, height: 300, mood: "snow" }),
          title: "Hakuba's north ridge",
          description: "Hut to hut along the ridge, 2,180 m of climbing over three days.",
        }}
      >
        Hakuba&rsquo;s north ridge
      </LinkPeek>
      . We finish slowly, on foot along{" "}
      <LinkPeek
        href="https://northline.example/walks/kiso-post-road"
        preview={{
          image: landscape("kiso-road", { width: 480, height: 300, mood: "dawn" }),
          title: "The Kiso post road",
          description: "Magome to Tsumago through cedar forest, about three hours.",
        }}
      >
        the Kiso post road
      </LinkPeek>
      .
    </p>
  );
}

"use client";

import { type KamishibaiSlide, KamishibaiSlider } from "@/components/miyuki-ui/kamishibai-slider";
import { landscape } from "@/registry/lib/art";

const story: KamishibaiSlide[] = [
  {
    src: landscape("sheet-sapporo", { width: 800, height: 600, mood: "night" }),
    caption: "The 05:48 leaves Sapporo before anyone is awake.",
    alt: "Ridges under a moonlit night sky",
  },
  {
    src: landscape("sheet-otaru", { width: 800, height: 600, mood: "dawn" }),
    caption: "Past Otaru the sea turns from black to pearl.",
    alt: "Pink light over mountains at dawn",
  },
  {
    src: landscape("sheet-niki", { width: 800, height: 600, mood: "snow" }),
    caption: "Snow starts in the orchards beyond Niki.",
    alt: "Snow falling on wooded hills",
  },
  {
    src: landscape("sheet-oshamambe", { width: 800, height: 600, mood: "day" }),
    caption: "At Oshamambe the cloud lifts off the bay.",
    alt: "Snowy peaks under a clear sky",
  },
  {
    src: landscape("sheet-hakodate", { width: 800, height: 600, mood: "dusk" }),
    caption: "We reach Hakodate as the harbour lamps come on.",
    alt: "Dusk over a harbour town and hills",
  },
];

export default function KamishibaiSliderDemo() {
  return <KamishibaiSlider aria-label="The line to Hakodate" slides={story} />;
}

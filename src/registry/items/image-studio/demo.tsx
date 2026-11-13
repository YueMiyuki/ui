"use client";

import { useMemo } from "react";
import { ImageStudio } from "@/components/miyuki-ui/image-studio";
import { abstract, landscape } from "@/registry/lib/art";
import { people } from "@/registry/lib/data";

const mei = people[4];

export default function ImageStudioDemo() {
  const { variants, gallery, styles } = useMemo(
    () => ({
      variants: [
        {
          id: "toya-1",
          src: landscape("toya-dusk", { width: 1200, height: 800, mood: "dusk" }),
          alt: "Lake Tōya at dusk",
          ratio: 1.5,
        },
        {
          id: "toya-2",
          src: landscape("toya-nakajima", { width: 1200, height: 800, mood: "dusk" }),
          alt: "Lake Tōya at dusk",
          ratio: 1.5,
        },
        {
          id: "toya-3",
          src: landscape("toya-lamps", { width: 1200, height: 800, mood: "night" }),
          alt: "Lake Tōya at night",
          ratio: 1.5,
        },
        {
          id: "toya-4",
          src: landscape("toya-stones", { width: 1200, height: 800, mood: "snow" }),
          alt: "Lake Tōya in snow",
          ratio: 1.5,
        },
      ],
      gallery: [
        {
          id: "g1",
          src: landscape("hakuba-first-snow", { width: 480, height: 640, mood: "snow" }),
          alt: "First snow above Hakuba",
          prompt: "First snow on the ridges above Hakuba, thin cloud below the peaks",
          ratio: 3 / 4,
        },
        {
          id: "g2",
          src: abstract("otaru-glass", { width: 480, height: 480 }),
          alt: "Otaru glass floats",
          prompt: "Glass floats from Otaru harbour, blue and amber, soft window light",
          ratio: 1,
        },
        {
          id: "g3",
          src: landscape("niseko-aurora", { width: 600, height: 400, mood: "aurora" }),
          alt: "Aurora behind Niseko",
          prompt: "Aurora over the hills behind Niseko, very still, long exposure",
          ratio: 1.5,
        },
        {
          id: "g4",
          src: landscape("kiso-morning", { width: 420, height: 630, mood: "dawn" }),
          alt: "Morning in the Kiso valley",
          prompt: "Morning light along the Kiso valley, mist on the river",
          ratio: 2 / 3,
        },
        {
          id: "g5",
          src: abstract("snow-light-study", { width: 600, height: 450 }),
          alt: "Snow light study",
          prompt: "Colour study of snow light at 4 pm, wide soft washes",
          ratio: 4 / 3,
        },
        {
          id: "g6",
          src: landscape("shirakawa-roofs", { width: 640, height: 360, mood: "night" }),
          alt: "Shirakawa roofs at night",
          prompt: "Thatched roofs of Shirakawa under snow at night, warm windows",
          ratio: 16 / 9,
        },
        {
          id: "g7",
          src: landscape("alps-from-matsumoto", { width: 480, height: 600, mood: "day" }),
          alt: "Northern Alps from Matsumoto",
          prompt: "The Northern Alps seen from Matsumoto on a clear winter day",
          ratio: 4 / 5,
        },
        {
          id: "g8",
          src: abstract("tea-steam", { width: 480, height: 640 }),
          alt: "Steam over green tea",
          prompt: "Steam rising from green tea in a cold room, pale green and grey",
          ratio: 3 / 4,
        },
        {
          id: "g9",
          src: landscape("yakushima-cedar", { width: 600, height: 450, mood: "dawn" }),
          alt: "Cedar ridge on Yakushima",
          prompt: "Cedar ridge on Yakushima at dawn, low cloud in the valleys",
          ratio: 4 / 3,
        },
        {
          id: "g10",
          src: landscape("aomori-deep-snow", { width: 480, height: 480, mood: "snow" }),
          alt: "Aomori in deep snow",
          prompt: "Hakkōda above Aomori in deep snow, snow monsters on the slope",
          ratio: 1,
        },
        {
          id: "g11",
          src: abstract("folded-paper", { width: 420, height: 630 }),
          alt: "Folded paper in cold light",
          prompt: "Folded washi paper in cold blue light, shallow focus",
          ratio: 2 / 3,
        },
        {
          id: "g12",
          src: landscape("nozawa-dusk", { width: 600, height: 400, mood: "dusk" }),
          alt: "Nozawa at dusk",
          prompt: "Nozawa Onsen village at dusk from the upper slopes",
          ratio: 1.5,
        },
      ],
      styles: [
        {
          id: "woodblock",
          name: "Woodblock",
          description: "Flat colour, carved edges",
          src: landscape("style-woodblock", { width: 400, height: 300, mood: "day" }),
        },
        {
          id: "ink",
          name: "Ink wash",
          description: "Soft greys that bleed",
          src: landscape("style-ink", { width: 400, height: 300, mood: "dawn" }),
        },
        {
          id: "watercolour",
          name: "Watercolour",
          description: "Loose washes, white paper",
          src: abstract("style-watercolour", { width: 400, height: 300 }),
        },
        {
          id: "night",
          name: "Night film",
          description: "Grain and cold blues",
          src: landscape("style-night", { width: 400, height: 300, mood: "night" }),
        },
        {
          id: "paper",
          name: "Paper cut",
          description: "Layered card, soft shadow",
          src: abstract("style-paper", { width: 400, height: 300 }),
        },
        {
          id: "glare",
          name: "Snow glare",
          description: "High key, nearly white",
          src: landscape("style-glare", { width: 400, height: 300, mood: "snow" }),
        },
      ],
    }),
    [],
  );

  return (
    <ImageStudio
      variants={variants}
      gallery={gallery}
      styles={styles}
      defaultStyle="woodblock"
      user={{ name: mei.name, email: mei.email, avatar: mei.avatar }}
    />
  );
}

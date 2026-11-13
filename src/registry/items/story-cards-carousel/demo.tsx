"use client";

import { StoryCardsCarousel } from "@/components/miyuki-ui/story-cards-carousel";
import { landscape, type Mood } from "@/registry/lib/art";

const stories: { category: string; title: string; seed: string; mood: Mood; body: [string, string] }[] = [
  {
    category: "Onsen",
    title: "Thirteen free baths in Nozawa",
    seed: "nozawa-baths",
    mood: "snow",
    body: [
      "The village keeps thirteen public baths, each in a small wooden house on a corner of the lane. They are looked after by the families who live nearby, and the only rule is to leave them as clean as you found them.",
      "Ōyu, in the middle of the square, is the hottest. Come at six in the morning, before the lifts open, and you will share it with the people who swept the snow off its roof.",
    ],
  },
  {
    category: "Rail",
    title: "The 5:52 from Otaru to Oshamambe",
    seed: "hakodate-line",
    mood: "dawn",
    body: [
      "Two carriages, one driver and a wood-burning heater that nobody remembers being installed. The line follows the coast for an hour before it turns inland through the beech forest.",
      "Sit on the left for the sea. At Niki the conductor walks the length of the train with a thermos and sells apple juice from the orchards beside the track.",
    ],
  },
  {
    category: "Food",
    title: "A morning at the Aomori fish market",
    seed: "aomori-market",
    mood: "day",
    body: [
      "Buy a ticket for a bowl of rice at the door, then walk the stalls and point at what you want on top: scallops, salmon roe, slices of tuna, a spoon of sea urchin.",
      "By eight the stallholders are packing up. Most of the catch has gone to the restaurants in town, and what is left goes into soup.",
    ],
  },
  {
    category: "Ice",
    title: "Walking on the drift ice at Shiretoko",
    seed: "shiretoko-ice",
    mood: "aurora",
    body: [
      "For a few weeks each February the sea off the peninsula freezes into plates of ice that drift down from the north. Guides take small groups out in dry suits.",
      "The ice creaks and shifts underfoot. Between the plates the water is clear enough to see the seals that come up to breathe.",
    ],
  },
  {
    category: "Summits",
    title: "First light on Asahidake",
    seed: "asahidake-summit",
    mood: "dawn",
    body: [
      "The first ropeway car leaves at six. From the top station the summit is two hours on foot, past fumaroles that steam even in the coldest weeks.",
      "On a clear morning you can see the whole Daisetsuzan range turn pink, then white. Bring a second pair of gloves for the way down.",
    ],
  },
  {
    category: "Coast",
    title: "Winter on the Shakotan cape",
    seed: "shakotan-cape",
    mood: "dusk",
    body: [
      "In summer the water here is famous for its blue. In winter the cape belongs to the wind, the gulls and a handful of inns that stay open for the sea urchin divers.",
      "The road out to the lighthouse closes after heavy snow. When it is open, the walk from the car park takes twenty minutes along the cliff.",
    ],
  },
];

const items = stories.map((story) => ({
  category: story.category,
  title: story.title,
  src: landscape(story.seed, { mood: story.mood, width: 960, height: 720 }),
  content: (
    <>
      <p>{story.body[0]}</p>
      <p>{story.body[1]}</p>
    </>
  ),
}));

export default function StoryCardsCarouselDemo() {
  return (
    <div className="flex size-full items-center">
      <StoryCardsCarousel items={items} aria-label="Winter stories" />
    </div>
  );
}

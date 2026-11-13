"use client";

import { PostcardBack, PostcardFlip } from "@/components/miyuki-ui/postcard-flip";
import { landscape } from "@/registry/lib/art";

export default function PostcardFlipDemo() {
  return (
    <figure className="flex w-full flex-col items-center gap-5">
      <PostcardFlip
        aria-label="Postcard from Nozawa"
        front={
          <div className="relative size-full bg-[oklch(0.97_0.006_85)] p-[3%]">
            <div className="relative size-full overflow-hidden">
              <img
                src={landscape("nozawa-postcard", { width: 880, height: 600, mood: "dawn" })}
                alt="Ridges above Nozawa at dawn"
                className="size-full object-cover"
              />
              <p className="absolute bottom-[7%] left-[6%] font-display text-[clamp(18px,6.5vw,30px)] leading-none font-semibold tracking-[-0.03em] text-[oklch(0.985_0.004_236)] [text-shadow:0_1px_12px_oklch(0.2_0.05_250/0.45)]">
                Greetings from Nozawa
              </p>
            </div>
          </div>
        }
        back={
          <PostcardBack
            message="Snowed all night. The outdoor bath was steaming at six and nobody else was up. Back on Thursday’s train."
            signature="Mei"
            postcode="047-0031"
            address={["Yuna Sato", "2-14 Ironai", "Otaru, Hokkaido"]}
            stamp={
              <img
                src={landscape("nozawa-stamp", { width: 120, height: 150, mood: "snow" })}
                alt=""
                className="size-full object-cover"
              />
            }
            postmark={{ place: "Nozawa", date: "13.1.26" }}
          />
        }
      />
      <figcaption className="text-sm text-muted-foreground">Click or drag the corner to turn it over.</figcaption>
    </figure>
  );
}

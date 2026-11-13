"use client";

import { Camera } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { InstantPhoto } from "@/components/miyuki-ui/instant-photo";
import { landscape, type Mood } from "@/registry/lib/art";

const roll: { seed: string; mood: Mood; caption: string; alt: string }[] = [
  { seed: "toya-shore", mood: "dusk", caption: "Lake Tōya, last ferry", alt: "Dusk over a lake ringed by hills" },
  { seed: "niseko-chair", mood: "day", caption: "Niseko, first chair 08:30", alt: "Snowy peaks under a clear sky" },
  { seed: "yotei-dawn", mood: "dawn", caption: "Yōtei from the road, 05:52", alt: "A cone-shaped mountain at dawn" },
  { seed: "otaru-night", mood: "night", caption: "Otaru canal, after the lamps", alt: "Moonlit ridges at night" },
  { seed: "kiso-snow", mood: "snow", caption: "Kiso valley, still snowing", alt: "Snow falling on wooded slopes" },
  { seed: "shiretoko-aurora", mood: "aurora", caption: "Shiretoko, 01:40", alt: "Green aurora over dark mountains" },
];

export default function InstantPhotoDemo() {
  const [shots, setShots] = useState([0, 1]);
  const [taken, setTaken] = useState(1);

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex min-h-[14rem] items-start sm:min-h-[19rem] justify-center gap-4 sm:gap-8">
        <AnimatePresence mode="popLayout" initial={false}>
          {shots.slice(-2).map((n, i) => {
            const shot = roll[n % roll.length];
            return (
              <motion.div
                key={n}
                layout
                exit={{ opacity: 0, x: -40, transition: { duration: 0.25 } }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
              >
                <InstantPhoto
                  src={landscape(shot.seed, { width: 480, height: 480, mood: shot.mood })}
                  alt={shot.alt}
                  caption={shot.caption}
                  developed={n === 0 ? true : undefined}
                  eject={n === taken && n > 1}
                  tilt={i === 0 ? -3 : 2}
                  className="w-36 sm:w-56"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <Button
        variant="secondary"
        iconStart={<Camera />}
        onPress={() => {
          const next = taken + 1;
          setTaken(next);
          setShots((s) => [...s, next]);
        }}
      >
        Take another
      </Button>
    </div>
  );
}

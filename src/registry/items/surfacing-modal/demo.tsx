"use client";

import { BedDouble, BedSingle, CloudSun, MountainSnow, Soup } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { ModalDescription, ModalTitle } from "@/components/miyuki-ui/modal";
import {
  SurfacingModal,
  SurfacingModalBody,
  SurfacingModalContent,
  SurfacingModalFooter,
  SurfacingModalTrigger,
} from "@/components/miyuki-ui/surfacing-modal";
import { landscape } from "@/registry/lib/art";

const prints = [
  { seed: "hoo-ridge", mood: "dawn", turn: "-rotate-6", alt: "The ridge above the hut at dawn" },
  { seed: "hoo-hut", mood: "snow", turn: "rotate-2", alt: "Fresh snow on the approach" },
  { seed: "hoo-valley", mood: "dusk", turn: "rotate-[7deg]", alt: "The valley at dusk" },
] as const;

const facts = [
  { icon: MountainSnow, label: "Altitude", value: "2,480 m" },
  { icon: BedSingle, label: "Beds", value: "18 in four rooms" },
  { icon: Soup, label: "Dinner", value: "Hot pot at 18:00" },
  { icon: CloudSun, label: "Weather briefing", value: "19:00 by the stove" },
];

export default function SurfacingModalDemo() {
  return (
    <SurfacingModal>
      <SurfacingModalTrigger icon={<BedDouble />}>Book the hut</SurfacingModalTrigger>
      <SurfacingModalBody>
        <SurfacingModalContent>
          <div className="flex flex-col gap-1.5 pe-8">
            <ModalTitle>Hōō hut, two nights</ModalTitle>
            <ModalDescription>Friday 16 to Sunday 18 January, above the Kiso valley.</ModalDescription>
          </div>
          <div className="flex justify-center py-2">
            {prints.map((p, i) => (
              <figure
                key={p.seed}
                className={`relative w-[min(9.5rem,33%)] shrink-0 rounded-md bg-card p-1.5 pb-5 shadow-md ring-1 ring-border transition-[rotate,translate,box-shadow] duration-300 ease-settle hover:z-10 hover:translate-y-[-3px] hover:rotate-0 hover:shadow-lg motion-reduce:transition-none ${p.turn} ${i > 0 ? "-ms-4" : ""}`}
              >
                <img
                  src={landscape(p.seed, { width: 320, height: 240, mood: p.mood })}
                  alt={p.alt}
                  className="aspect-[4/3] w-full rounded-[3px] object-cover"
                />
              </figure>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <div className="flex min-w-0 flex-col">
                  <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
                  <dd className="text-sm leading-5 font-medium text-foreground">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </SurfacingModalContent>
        <SurfacingModalFooter>
          <Button variant="secondary" slot="close">
            Cancel
          </Button>
          <Button slot="close">Book now</Button>
        </SurfacingModalFooter>
      </SurfacingModalBody>
    </SurfacingModal>
  );
}

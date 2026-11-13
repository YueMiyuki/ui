"use client";

import { Button } from "@/components/miyuki-ui/button";
import { TiltCard, TiltCardBody, TiltCardItem } from "@/components/miyuki-ui/tilt-card";
import { landscape } from "@/registry/lib/art";

export default function TiltCardDemo() {
  return (
    <TiltCard className="w-full max-w-[21rem]">
      <TiltCardBody className="p-3">
        <TiltCardItem depth={60}>
          <img
            src={landscape("hakuba", { mood: "dawn", width: 720, height: 520 })}
            alt="First light on the ridges above Hakuba"
            className="aspect-[18/13] w-full rounded-sm object-cover"
          />
        </TiltCardItem>
        <div className="px-2 pt-4 pb-2 [transform-style:preserve-3d]">
          <TiltCardItem as="h3" depth={40} className="text-lg font-semibold tracking-[-0.01em]">
            Hakuba ridge traverse
          </TiltCardItem>
          <TiltCardItem as="p" depth={30} className="mt-0.5 text-sm text-muted-foreground tabular-nums">
            Three days, high point 2,932 m
          </TiltCardItem>
          <div className="mt-5 flex items-center justify-end gap-2 [transform-style:preserve-3d]">
            <TiltCardItem depth={20}>
              <Button variant="ghost">Details</Button>
            </TiltCardItem>
            <TiltCardItem depth={30}>
              <Button>Book</Button>
            </TiltCardItem>
          </div>
        </div>
      </TiltCardBody>
    </TiltCard>
  );
}

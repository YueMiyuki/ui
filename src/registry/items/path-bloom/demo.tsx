"use client";

import { Button } from "@/components/miyuki-ui/button";
import { PathBloom } from "@/components/miyuki-ui/path-bloom";

export default function PathBloomDemo() {
  return (
    <PathBloom title="Five streams, one river" description="Every station, gauge and forecast in one place.">
      <Button size="lg">Follow the water</Button>
    </PathBloom>
  );
}

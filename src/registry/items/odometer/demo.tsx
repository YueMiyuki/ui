"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Odometer } from "@/components/miyuki-ui/odometer";

export default function OdometerDemo() {
  const [snow, setSnow] = useState(1284);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">Season snowfall · Hakuba 47</p>
        <Odometer
          value={snow}
          className="text-6xl tracking-tight sm:text-7xl"
          suffix={<span className="text-2xl font-medium text-muted-foreground sm:text-3xl">cm</span>}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onPress={() => setSnow((s) => s + 7)}>
          Add 7 cm
        </Button>
        <Button variant="secondary" onPress={() => setSnow((s) => s + 120)}>
          Add 120 cm
        </Button>
      </div>
    </div>
  );
}

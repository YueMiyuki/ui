"use client";

import { useState } from "react";
import { AbacusInput } from "@/components/miyuki-ui/abacus-input";
import { Button } from "@/components/miyuki-ui/button";

const fares = [
  { stop: "Minami-Otaru", yen: 210 },
  { stop: "Zenibako", yen: 640 },
  { stop: "Sapporo", yen: 1840 },
];

export default function AbacusInputDemo() {
  const [fare, setFare] = useState(1840);
  return (
    <div className="flex flex-col items-center gap-5">
      <AbacusInput label="Fare, in yen" value={fare} onChange={setFare} />
      <div className="flex flex-wrap justify-center gap-2">
        {fares.map((f) => (
          <Button key={f.stop} variant="secondary" size="sm" onPress={() => setFare(f.yen)}>
            {f.stop}
          </Button>
        ))}
      </div>
    </div>
  );
}

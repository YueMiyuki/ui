"use client";

import { useEffect, useRef, useState } from "react";
import { KotoStrings, type KotoStringsHandle } from "@/components/miyuki-ui/koto-strings";
import { Switch } from "@/components/miyuki-ui/switch";

export default function KotoStringsDemo() {
  const [sound, setSound] = useState(false);
  const strings = useRef<KotoStringsHandle>(null);

  useEffect(() => {
    const id = window.setTimeout(() => strings.current?.strum({ strength: 0.6, duration: 1300 }), 1300);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-foreground">Run the pointer across the strings.</p>
        <Switch size="sm" isSelected={sound} onChange={setSound}>
          Sound
        </Switch>
      </div>
      <KotoStrings ref={strings} sound={sound} />
    </div>
  );
}

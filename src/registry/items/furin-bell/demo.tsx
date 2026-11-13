"use client";

import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { FurinBell } from "@/components/miyuki-ui/furin-bell";
import { Switch } from "@/components/miyuki-ui/switch";

export default function FurinBellDemo() {
  const [count, setCount] = useState(3);
  const [sound, setSound] = useState(false);

  return (
    <div className="flex flex-col items-center gap-14">
      <FurinBell size={56} count={count} sound={sound} onPress={() => setCount(0)} />
      <div className="flex flex-col items-center gap-4">
        <Button variant="secondary" onPress={() => setCount((c) => c + 1)}>
          Send a notification
        </Button>
        <Switch size="sm" isSelected={sound} onChange={setSound}>
          Chime
        </Switch>
      </div>
    </div>
  );
}

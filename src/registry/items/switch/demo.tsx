"use client";

import { Switch } from "@/components/miyuki-ui/switch";

export default function SwitchDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col divide-y divide-border">
      <Switch className="py-3.5 first:pt-0">Night mode after sunset</Switch>
      <Switch className="py-3.5" defaultSelected description="Bulletins for the regions you follow.">
        Avalanche alerts
      </Switch>
      <Switch className="py-3.5 last:pb-0" isDisabled>
        Share live location
      </Switch>
    </div>
  );
}

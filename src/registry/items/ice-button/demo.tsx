"use client";

import { IceButton } from "@/components/miyuki-ui/ice-button";

export default function IceButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <IceButton size="lg">Break the ice</IceButton>
      <IceButton size="lg" tone="deep">
        Go under
      </IceButton>
    </div>
  );
}

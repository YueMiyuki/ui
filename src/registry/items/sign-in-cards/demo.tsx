"use client";

import { MountainSnow } from "lucide-react";
import { useState } from "react";
import { SignInCard, SignUpCard } from "@/components/miyuki-ui/sign-in-cards";

const logo = (
  <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
    <MountainSnow aria-hidden="true" className="size-5" strokeWidth={1.75} />
  </span>
);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function SignInCardsDemo() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  return mode === "sign-in" ? (
    <SignInCard logo={logo} onSubmit={() => wait(1200)} onSwitch={() => setMode("sign-up")} />
  ) : (
    <SignUpCard
      logo={logo}
      description="Mountain forecasts and avalanche bulletins for your whole team."
      onSubmit={() => wait(1200)}
      onSwitch={() => setMode("sign-in")}
    />
  );
}

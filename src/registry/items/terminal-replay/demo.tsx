"use client";

import { TerminalReplay, type TerminalReplayLine } from "@/components/miyuki-ui/terminal-replay";

const lines: TerminalReplayLine[] = [
  { type: "command", text: "pnpm add @shirakaba/forecast" },
  { type: "output", text: "Resolved 14 packages in 820ms", tone: "muted" },
  { type: "output", text: "+ @shirakaba/forecast 2.6.1", tone: "success" },
  { type: "command", text: "forecast --resort hakuba --days 3" },
  { type: "output", text: "Day      Snowfall   Summit", tone: "muted" },
  { type: "output", text: "Fri 12   22 cm      -11 °C" },
  { type: "output", text: "Sat 13   35 cm      -14 °C" },
  { type: "output", text: "Sun 14    4 cm       -8 °C" },
];

export default function TerminalReplayDemo() {
  return <TerminalReplay lines={lines} prompt="~/kiso $" title="kiso" className="w-full max-w-xl" />;
}

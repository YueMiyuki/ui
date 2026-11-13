"use client";

import { useEffect, useState } from "react";
import { SplitFlapBoard } from "@/components/miyuki-ui/split-flap-board";
import { Switch } from "@/components/miyuki-ui/switch";

const row = (time: string, place: string, status: string) => `${time} ${place.padEnd(8)} ${status}`;

const boards = [
  [
    row("06:12", "OTARU", "ON TIME"),
    row("06:40", "SAPPORO", "ON TIME"),
    row("07:05", "NISEKO", "DELAYED"),
    row("07:30", "HAKODATE", "ON TIME"),
  ].join("\n"),
  [
    row("07:52", "YOICHI", "ON TIME"),
    row("08:15", "CHITOSE", "DELAYED"),
    row("08:31", "KUSHIRO", "ON TIME"),
    row("09:04", "ABASHIRI", "ON TIME"),
  ].join("\n"),
];

export default function SplitFlapBoardDemo() {
  const [page, setPage] = useState(0);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPage((p) => (p + 1) % boards.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-foreground">
          Kutchan <span className="font-normal text-muted-foreground">· Platform 2</span>
        </p>
        <Switch size="sm" isSelected={sound} onChange={setSound}>
          Sound
        </Switch>
      </div>
      <SplitFlapBoard text={boards[page]} accent="DELAYED" sound={sound} />
    </div>
  );
}

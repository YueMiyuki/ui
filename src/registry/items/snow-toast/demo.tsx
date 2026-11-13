"use client";

import { Bath, CableCar, Download } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { SnowToaster, snowToast } from "@/components/miyuki-ui/snow-toast";

export default function SnowToastDemo() {
  return (
    <div className="flex w-full max-w-[880px] flex-col items-start gap-2">
      <Button
        variant="secondary"
        iconStart={<Download />}
        onPress={() =>
          snowToast("Route saved for offline use", {
            icon: <Download />,
            description: "Hakuba traverse, 18.4 km, with 24 waypoints.",
          })
        }
      >
        Save route
      </Button>
      <Button
        variant="secondary"
        iconStart={<CableCar />}
        onPress={() =>
          snowToast("23 of 25 lifts running", {
            icon: <CableCar />,
            description: "The summit quad opens at 11:00 once the wind drops.",
          })
        }
      >
        Check the lifts
      </Button>
      <Button
        variant="secondary"
        iconStart={<Bath />}
        onPress={() =>
          snowToast("Bath booked for 19:30", {
            icon: <Bath />,
            description: "Private bath 2 at Nozawa, for 40 minutes.",
            action: { label: "Undo", onPress: () => snowToast("Booking cancelled") },
          })
        }
      >
        Book the onsen
      </Button>
      <SnowToaster />
    </div>
  );
}

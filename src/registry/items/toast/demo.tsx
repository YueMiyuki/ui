"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { Toaster, toast } from "@/components/miyuki-ui/toast";

function publish() {
  return new Promise<number>((resolve) => setTimeout(() => resolve(1284), 2400));
}

export default function ToastDemo() {
  return (
    <div className="flex max-w-xl flex-wrap items-center justify-center gap-2">
      <Button
        variant="secondary"
        onPress={() =>
          toast.success("Changes saved", { description: "Everyone on the Hakuba trip will see the new route." })
        }
      >
        Save changes
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toast("Route archived", {
            icon: <Archive />,
            action: { label: "Undo", onPress: () => toast("Route restored", { icon: <ArchiveRestore /> }) },
          })
        }
      >
        Archive route
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toast.error("Could not reach the station", {
            description: "Otaru Harbour last reported at 06:40. We will keep trying.",
          })
        }
      >
        Sync station
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toast.promise(publish, {
            loading: "Publishing forecast…",
            success: (count) => `Forecast published to ${count.toLocaleString("en")} subscribers`,
            error: "Could not publish the forecast",
          })
        }
      >
        Publish forecast
      </Button>
      <Toaster />
    </div>
  );
}

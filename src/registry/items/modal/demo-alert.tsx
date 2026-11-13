"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { AlertDialog, ModalTrigger } from "@/components/miyuki-ui/modal";

export default function ModalAlertDemo() {
  return (
    <ModalTrigger>
      <Button variant="secondary" iconStart={<Trash2 />}>
        Delete route
      </Button>
      <AlertDialog
        tone="destructive"
        title="Delete Hakuba traverse?"
        actionLabel="Delete route"
        onAction={() => new Promise((resolve) => setTimeout(resolve, 900))}
      >
        The route and its 24 waypoints will be removed for everyone. This cannot be undone.
      </AlertDialog>
    </ModalTrigger>
  );
}

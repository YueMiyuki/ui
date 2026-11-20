"use client";

import { useState } from "react";
import { Alert, AlertActions, AlertDescription, AlertTitle } from "@/components/miyuki-ui/alert";
import { Button } from "@/components/miyuki-ui/button";

export default function AlertActionsDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex w-full max-w-xl flex-col items-center">
      {open ? (
        <Alert tone="warning" onDismiss={() => setOpen(false)} className="w-full">
          <AlertTitle>The 07:42 to Matsumoto may run late</AlertTitle>
          <AlertDescription>
            Heavy snow near Kiso-Fukushima is holding trains for up to 40 minutes. You can move to a later train at no
            cost until 18:00.
          </AlertDescription>
          <AlertActions>
            <Button>Change booking</Button>
            <Button variant="secondary" slot="dismiss">
              Keep it
            </Button>
          </AlertActions>
        </Alert>
      ) : (
        <Button variant="ghost" size="sm" onPress={() => setOpen(true)}>
          Show the alert again
        </Button>
      )}
    </div>
  );
}

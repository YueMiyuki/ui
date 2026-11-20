"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/miyuki-ui/alert";

export default function AlertOutlineDemo() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Alert variant="outline" tone="info">
        <AlertTitle>Seat reservations open a month ahead</AlertTitle>
        <AlertDescription>
          Reserved seats on the Shinano express go on sale at 10:00, one month before the day of travel.
        </AlertDescription>
      </Alert>
      <Alert variant="outline" tone="success">
        <AlertTitle>Your refund is on its way</AlertTitle>
        <AlertDescription>
          ¥6,800 for the cancelled Hakuba day pass will reach your card within five days.
        </AlertDescription>
      </Alert>
      <Alert variant="outline" tone="warning">
        <AlertTitle>Chains required above Kamishiro</AlertTitle>
        <AlertDescription>The road to the Goryu car park is icy. Fit chains or take the shuttle bus.</AlertDescription>
      </Alert>
      <Alert variant="outline" tone="error">
        <AlertTitle>We could not load the snow report</AlertTitle>
        <AlertDescription>
          The Nozawa weather station has not answered since 05:40. The figures below are from yesterday.
        </AlertDescription>
      </Alert>
    </div>
  );
}

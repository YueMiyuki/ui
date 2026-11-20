"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/miyuki-ui/alert";

export default function AlertDemo() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Alert tone="info">
        <AlertTitle>Night skiing starts on 20 December</AlertTitle>
        <AlertDescription>Lifts 3 and 5 at Hakuba Goryu run until 21:00 on Fridays and Saturdays.</AlertDescription>
      </Alert>
      <Alert tone="success">
        <AlertTitle>Your lift pass is ready</AlertTitle>
        <AlertDescription>Collect it from the machines at the gondola base with booking HKB-2841.</AlertDescription>
      </Alert>
      <Alert tone="warning">
        <AlertTitle>High winds on the upper mountain</AlertTitle>
        <AlertDescription>The summit chair may close after 13:00. The gondola keeps running.</AlertDescription>
      </Alert>
      <Alert tone="error">
        <AlertTitle>Your payment did not go through</AlertTitle>
        <AlertDescription>The card ending 4417 was declined. Try another card or pay at the station.</AlertDescription>
      </Alert>
      <Alert tone="neutral">
        <AlertTitle>Spring timetable from 14 March</AlertTitle>
        <AlertDescription>Some Kiso line trains leave earlier. Check your train before you travel.</AlertDescription>
      </Alert>
    </div>
  );
}

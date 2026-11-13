"use client";

import { Notification } from "@/components/miyuki-ui/notification";

export default function NotificationTonesDemo() {
  return (
    <div className="flex w-[360px] max-w-full flex-col gap-3">
      <Notification title="Weekly digest ready" time="1 h ago">
        Seven new routes and two station notes from your team.
      </Notification>
      <Notification tone="info" title="New station nearby" time="3 h ago">
        Shirakawa East now reports every ten minutes.
      </Notification>
      <Notification tone="success" title="Backup complete" time="Yesterday">
        All 1,284 waypoints are saved to the archive.
      </Notification>
      <Notification tone="warning" title="Snow load rising" time="Yesterday">
        Roof sensors at the Nozawa shelter read 212 kg/m².
      </Notification>
      <Notification tone="destructive" title="Upload failed" time="2 days ago">
        Kiso trail photos could not be sent. Try again on a stronger signal.
      </Notification>
    </div>
  );
}

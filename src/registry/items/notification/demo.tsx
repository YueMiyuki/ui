"use client";

import { useState } from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Button } from "@/components/miyuki-ui/button";
import { Notification } from "@/components/miyuki-ui/notification";
import { avatar } from "@/registry/lib/art";

export default function NotificationDemo() {
  const [closed, setClosed] = useState<string[]>([]);
  const close = (id: string) => () => setClosed((ids) => [...ids, id]);

  return (
    <div className="flex w-[360px] max-w-full flex-col gap-3">
      {!closed.includes("published") && (
        <Notification tone="success" title="Forecast published" time="2 min ago" onClose={close("published")}>
          Hakuba, 14 February, is live for 1,284 subscribers.
        </Notification>
      )}
      <Notification
        avatar={<Avatar src={avatar("haruka.ono")} name="Haruka Ono" size="lg" />}
        title="Haruka mentioned you"
        time="9 min ago"
        unread
        actions={
          <>
            <Button size="sm" variant="secondary">
              Reply
            </Button>
            <Button size="sm" variant="brand">
              View thread
            </Button>
          </>
        }
      >
        “Can you check the wind on Happo ridge before we post the morning forecast?”
      </Notification>
      {!closed.includes("offline") && (
        <Notification
          tone="warning"
          title="Station offline"
          time="18 min ago"
          onClose={close("offline")}
          actions={
            <Button size="sm" variant="secondary">
              View station
            </Button>
          }
        >
          Otaru Harbour has not reported since 06:40. Readings resume when it reconnects.
        </Notification>
      )}
    </div>
  );
}

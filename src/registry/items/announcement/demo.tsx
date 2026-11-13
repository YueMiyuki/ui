"use client";

import { Announcement } from "@/components/miyuki-ui/announcement";

export default function AnnouncementDemo() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-10">
      <Announcement href="#bulletins">Avalanche bulletins now cover Tōhoku</Announcement>
      <Announcement
        variant="bar"
        label="Notice"
        href="#status"
        linkText="Status page"
        className="overflow-clip rounded-xl"
      >
        Maintenance tonight from 01:00 to 03:00 JST
      </Announcement>
    </div>
  );
}

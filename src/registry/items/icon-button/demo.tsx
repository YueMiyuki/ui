"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { IconButton } from "@/components/miyuki-ui/icon-button";

export default function IconButtonDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3">
        <IconButton aria-label="Add stop">
          <Plus />
        </IconButton>
        <IconButton aria-label="Search timetable">
          <Search />
        </IconButton>
        <IconButton aria-label="Delete route">
          <Trash2 />
        </IconButton>
      </div>
      <div className="flex items-center gap-3">
        <IconButton variant="ghost" aria-label="Add stop">
          <Plus />
        </IconButton>
        <IconButton variant="ghost" aria-label="Search timetable">
          <Search />
        </IconButton>
        <IconButton variant="ghost" aria-label="Delete route">
          <Trash2 />
        </IconButton>
      </div>
      <div className="flex items-center gap-3">
        <IconButton size="sm" variant="soft" aria-label="Search timetable, small">
          <Search />
        </IconButton>
        <IconButton size="md" variant="soft" aria-label="Search timetable, medium">
          <Search />
        </IconButton>
        <IconButton size="lg" variant="soft" aria-label="Search timetable, large">
          <Search />
        </IconButton>
      </div>
      <IconButton variant="primary" isPending aria-label="Saving route">
        <Plus />
      </IconButton>
    </div>
  );
}

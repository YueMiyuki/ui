"use client";

import { Button } from "@/components/miyuki-ui/button";
import { EmptyState } from "@/components/miyuki-ui/empty-state";

export default function EmptyStateVariantsDemo() {
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
      <EmptyState
        size="sm"
        bordered
        illustration="inbox"
        title="No messages yet"
        description="When a guide or another traveller writes to you, the message arrives here."
        actions={
          <Button size="sm" variant="secondary">
            Write to a guide
          </Button>
        }
      />
      <EmptyState
        size="sm"
        bordered
        illustration="search"
        title="No saved routes"
        description="Save a route from the map and it stays here, ready to use offline."
        actions={
          <Button size="sm" variant="secondary">
            Open the map
          </Button>
        }
      />
      <EmptyState
        size="sm"
        bordered
        illustration="folder"
        title="No files"
        description="Tickets, rail passes and booking emails you add are kept with the trip."
        actions={
          <Button size="sm" variant="secondary">
            Add files
          </Button>
        }
      />
      <EmptyState
        size="sm"
        bordered
        illustration="start"
        title="Start your first trip"
        description="Pick a town and a week, and we suggest trains and places to stay."
        actions={<Button size="sm">Plan a trip</Button>}
      />
    </div>
  );
}

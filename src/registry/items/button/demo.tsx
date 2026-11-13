"use client";

import { Button } from "@/components/miyuki-ui/button";

export default function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button>Save changes</Button>
      <Button variant="brand">Book a seat</Button>
      <Button variant="secondary">Preview</Button>
      <Button variant="soft">Add to list</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="destructive">Delete route</Button>
    </div>
  );
}

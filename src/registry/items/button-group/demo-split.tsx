"use client";

import { ChevronDown, Save } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { ButtonGroup } from "@/components/miyuki-ui/button-group";

export default function ButtonGroupSplitDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <ButtonGroup aria-label="Save route">
        <Button iconStart={<Save aria-hidden="true" />}>Save</Button>
        <Button aria-label="More ways to save" iconStart={<ChevronDown aria-hidden="true" />} />
      </ButtonGroup>
      <ButtonGroup aria-label="Save draft">
        <Button variant="secondary">Save draft</Button>
        <Button variant="secondary" aria-label="More ways to save" iconStart={<ChevronDown aria-hidden="true" />} />
      </ButtonGroup>
    </div>
  );
}

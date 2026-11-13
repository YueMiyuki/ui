"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/miyuki-ui/badge";
import { Button } from "@/components/miyuki-ui/button";
import { Checkbox, CheckboxGroup } from "@/components/miyuki-ui/checkbox";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/miyuki-ui/drawer";

const groups = [
  { id: "grade", label: "Grade", options: ["Easy", "Moderate", "Hard", "Expert"] },
  { id: "season", label: "Best in", options: ["Winter", "Spring", "Summer", "Autumn"] },
  { id: "along", label: "Along the way", options: ["Mountain hut", "Hot spring", "Train station at the end"] },
];

type Filters = Record<string, string[]>;
const empty: Filters = { grade: [], season: [], along: [] };

export default function DrawerDemo() {
  const [applied, setApplied] = useState<Filters>({ ...empty, grade: ["Moderate"], season: ["Winter"] });
  const [draft, setDraft] = useState<Filters>(applied);
  const count = Object.values(applied).flat().length;

  return (
    <DrawerTrigger onOpenChange={(open) => open && setDraft(applied)}>
      <Button
        variant="secondary"
        iconStart={<SlidersHorizontal />}
        iconEnd={
          count > 0 ? (
            <Badge size="sm" tone="brand">
              {count}
            </Badge>
          ) : undefined
        }
      >
        Filters
      </Button>
      <Drawer>
        {({ close }) => (
          <>
            <DrawerHeader>
              <DrawerTitle>Filters</DrawerTitle>
              <p className="text-[13px] text-muted-foreground">Routes in the Northern Alps</p>
            </DrawerHeader>
            <DrawerBody className="flex flex-col gap-7 py-4">
              {groups.map((group) => (
                <CheckboxGroup
                  key={group.id}
                  label={group.label}
                  value={draft[group.id]}
                  onChange={(value) => setDraft((d) => ({ ...d, [group.id]: value }))}
                  className="gap-3"
                >
                  {group.options.map((option) => (
                    <Checkbox key={option} value={option}>
                      {option}
                    </Checkbox>
                  ))}
                </CheckboxGroup>
              ))}
            </DrawerBody>
            <DrawerFooter className="flex-nowrap">
              <Button variant="secondary" className="flex-1" onPress={() => setDraft(empty)}>
                Reset
              </Button>
              <Button
                className="flex-1"
                onPress={() => {
                  setApplied(draft);
                  close();
                }}
              >
                Apply
              </Button>
            </DrawerFooter>
          </>
        )}
      </Drawer>
    </DrawerTrigger>
  );
}

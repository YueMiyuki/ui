"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Selection } from "react-aria-components";
import { Badge } from "@/components/miyuki-ui/badge";
import { Button } from "@/components/miyuki-ui/button";
import { Dropdown, DropdownItem, DropdownMenu } from "@/components/miyuki-ui/dropdown";

const models = [
  { id: "standard", name: "Standard", description: "9 km grid, updated every six hours." },
  { id: "fine", name: "Fine mesh", description: "1 km grid, updated every hour.", isNew: true },
  { id: "ensemble", name: "Ensemble", description: "31 runs blended into a likely range." },
];

export default function DropdownModelDemo() {
  const [selected, setSelected] = useState<Selection>(new Set(["standard"]));
  const current = models.find((model) => selected !== "all" && selected.has(model.id)) ?? models[0];

  return (
    <Dropdown>
      <Button variant="secondary" iconEnd={<ChevronDown className="text-muted-foreground" />}>
        <span className="text-muted-foreground">Forecast model:</span> {current.name}
      </Button>
      <DropdownMenu
        aria-label="Forecast model"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={selected}
        onSelectionChange={setSelected}
        popoverClassName="w-80"
      >
        {models.map((model) => (
          <DropdownItem key={model.id} id={model.id} textValue={model.name} description={model.description}>
            {model.name}
            {model.isNew && (
              <Badge size="sm" tone="brand" className="ms-2 align-[-1px]">
                New
              </Badge>
            )}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}

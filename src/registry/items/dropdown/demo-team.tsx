"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import type { Selection } from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Button } from "@/components/miyuki-ui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownSeparator,
} from "@/components/miyuki-ui/dropdown";

const teams = [
  { id: "kitakaze", name: "Kitakaze Outfitters" },
  { id: "hoshizora", name: "Hoshizora Weather" },
  { id: "northline", name: "Northline Rail" },
];

export default function DropdownTeamDemo() {
  const [selected, setSelected] = useState<Selection>(new Set(["kitakaze"]));
  const current = teams.find((team) => selected !== "all" && selected.has(team.id)) ?? teams[0];

  return (
    <Dropdown>
      <Button
        variant="ghost"
        aria-label={`Team: ${current.name}`}
        className="h-11 gap-2.5 ps-2 pe-2.5"
        iconStart={<Avatar name={current.name} shape="rounded" size="md" aria-hidden />}
        iconEnd={<ChevronsUpDown className="text-muted-foreground" />}
      >
        {current.name}
      </Button>
      <DropdownMenu indicator="check" popoverClassName="w-64">
        <DropdownSection
          title="Teams"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={selected}
          onSelectionChange={setSelected}
        >
          {teams.map((team) => (
            <DropdownItem
              key={team.id}
              id={team.id}
              textValue={team.name}
              icon={<Avatar name={team.name} shape="rounded" size="xs" aria-hidden />}
            >
              {team.name}
            </DropdownItem>
          ))}
        </DropdownSection>
        <DropdownSeparator />
        <DropdownItem icon={<Plus />}>Create team</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

"use client";

import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { people } from "@/registry/lib/data";

const guides = [people[0], people[5], people[6], people[2], people[8], people[7]];

export default function SelectAvatarsDemo() {
  return (
    <Select
      className="w-full max-w-xs"
      label="Assign a guide"
      placeholder="Choose a guide"
      items={guides}
      defaultValue="aiko.tanaka"
    >
      {(person) => (
        <SelectItem id={person.handle} avatar={person.avatar} description={person.role}>
          {person.name}
        </SelectItem>
      )}
    </Select>
  );
}

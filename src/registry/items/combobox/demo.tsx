"use client";

import { ComboBox, ComboBoxItem } from "@/components/miyuki-ui/combobox";
import { people } from "@/registry/lib/data";

const guides = [0, 5, 7, 8, 10, 11, 2, 6].map((i) => people[i]);

export default function ComboBoxDemo() {
  return (
    <ComboBox
      className="w-full max-w-xs"
      label="Guide"
      placeholder="Type a name"
      defaultItems={guides}
      description="Guides lead groups of up to eight."
    >
      {(person) => (
        <ComboBoxItem id={person.handle} textValue={person.name} avatar={person.avatar} description={person.role}>
          {person.name}
        </ComboBoxItem>
      )}
    </ComboBox>
  );
}

"use client";

import { Select, SelectItem } from "@/components/miyuki-ui/select";

const resorts = ["Niseko", "Hakuba", "Nozawa", "Lake Tōya", "Kiso", "Matsumoto"];

export default function SelectDemo() {
  return (
    <Select
      className="w-full max-w-xs"
      label="Resort"
      placeholder="Choose a resort"
      defaultValue="hakuba"
      description="Lift prices update for the resort you choose."
    >
      {resorts.map((name) => (
        <SelectItem key={name} id={name.toLowerCase()}>
          {name}
        </SelectItem>
      ))}
    </Select>
  );
}

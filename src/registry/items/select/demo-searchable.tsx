"use client";

import { Select, SelectItem, SelectSection } from "@/components/miyuki-ui/select";

const regions = [
  { name: "Hokkaido", prefectures: ["Hokkaido"] },
  { name: "Tōhoku", prefectures: ["Aomori", "Iwate", "Akita", "Miyagi", "Yamagata", "Fukushima"] },
  { name: "Chūbu", prefectures: ["Niigata", "Toyama", "Ishikawa", "Fukui", "Nagano", "Gifu", "Yamanashi"] },
  { name: "Kantō", prefectures: ["Gunma", "Tochigi"] },
];

export default function SelectSearchableDemo() {
  return (
    <Select
      className="w-full max-w-xs"
      label="Prefecture"
      placeholder="Choose a prefecture"
      searchable
      searchPlaceholder="Search prefectures"
    >
      {regions.map((region) => (
        <SelectSection key={region.name} title={region.name}>
          {region.prefectures.map((name) => (
            <SelectItem key={name} id={name.toLowerCase()}>
              {name}
            </SelectItem>
          ))}
        </SelectSection>
      ))}
    </Select>
  );
}

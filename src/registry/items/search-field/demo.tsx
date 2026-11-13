"use client";

import { SearchField } from "@/components/miyuki-ui/search-field";

export default function SearchFieldDemo() {
  return (
    <SearchField
      label="Search timetables"
      placeholder="Station, line or train number"
      shortcut="/"
      className="w-full max-w-sm"
    />
  );
}

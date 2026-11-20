"use client";

import { TagInput } from "@/components/miyuki-ui/tag-input";

const keywords = [
  "powder",
  "wind crust",
  "breakable crust",
  "spring snow",
  "ice",
  "cornice",
  "avalanche debris",
  "tree wells",
  "whiteout",
  "fresh tracks",
  "trail flagged",
  "trail closed",
  "hut open",
  "rope tow running",
];

export default function TagInputSuggestionsDemo() {
  return (
    <TagInput
      className="w-full max-w-md"
      label="Keywords"
      description="Help others find your report on the Kurodake ridge."
      placeholder="Add a keyword"
      suggestions={keywords}
      maxTags={6}
      defaultValue={["wind crust", "cornice"]}
    />
  );
}

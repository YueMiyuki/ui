"use client";

import { Tag, TagGroup } from "@/components/miyuki-ui/tag-group";

const topics = ["Snow", "Avalanche", "Wind", "Roads", "Huts", "Trains"];

export default function TagGroupDemo() {
  return (
    <TagGroup
      label="Topics"
      description="The morning bulletin covers what you choose."
      selectionMode="multiple"
      defaultSelectedKeys={["Snow", "Avalanche"]}
      className="w-full max-w-lg"
    >
      {topics.map((t) => (
        <Tag key={t} id={t}>
          {t}
        </Tag>
      ))}
    </TagGroup>
  );
}

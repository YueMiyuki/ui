"use client";

import { useState } from "react";
import { LinkButton } from "@/components/miyuki-ui/link-button";
import { Tag, TagGroup } from "@/components/miyuki-ui/tag-group";
import { people } from "@/registry/lib/data";

const initial = [people[0], people[2], people[5], people[10]];

export default function TagGroupRemovableDemo() {
  const [recipients, setRecipients] = useState(initial);

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <TagGroup
        label="Recipients"
        items={recipients}
        onRemove={(keys) => setRecipients((list) => list.filter((p) => !keys.has(p.handle)))}
        renderEmptyState={() => "No one will get this report."}
      >
        {(p) => (
          <Tag id={p.handle} avatar={p.avatar}>
            {p.name}
          </Tag>
        )}
      </TagGroup>
      {recipients.length < initial.length && (
        <LinkButton tone="brand" size="sm" className="self-start" onPress={() => setRecipients(initial)}>
          Restore recipients
        </LinkButton>
      )}
    </div>
  );
}

"use client";

import { CloseButton } from "@/components/miyuki-ui/close-button";

const sizes = ["sm", "md", "lg"] as const;

export default function CloseButtonDemo() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        {sizes.map((size) => (
          <CloseButton key={size} size={size} aria-label={`Dismiss notice (${size})`} />
        ))}
      </div>
      <div className="flex items-center gap-6">
        {sizes.map((size) => (
          <CloseButton key={size} size={size} variant="filled" aria-label={`Dismiss notice, filled (${size})`} />
        ))}
      </div>
    </div>
  );
}

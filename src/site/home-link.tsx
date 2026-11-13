"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/site/mark";

export function HomeLink() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Link
      href="/"
      aria-label="miyuki-ui home"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="-mx-1 rounded-md px-1 py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <Wordmark melted={hovered || focused} />
    </Link>
  );
}

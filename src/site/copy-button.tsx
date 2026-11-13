"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";
import { iconButtonClass } from "@/site/icon-button";

export function CopyButton({
  text,
  label = "Copy",
  className,
}: {
  text: string | ((target: Element) => string | undefined);
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(target: Element) {
    const value = typeof text === "function" ? text(target) : text;
    if (value == null) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      aria-label={copied ? "Copied" : label}
      onPress={(event) => copy(event.target)}
      className={iconButtonClass(
        cn(copied && "text-brand-strong hover:text-brand-strong data-[hovered]:text-brand-strong", className),
      )}
    >
      <MorphIcon shapes={morphIcons.copyCheck} shape={copied ? "check" : "copy"} />
    </Button>
  );
}

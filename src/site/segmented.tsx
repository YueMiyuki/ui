"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
}) {
  const pill = useId();
  const reduce = useReducedMotion();

  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [next] = [...keys];
        if (next != null) onChange(next as T);
      }}
      className="inline-flex h-8 shrink-0 items-center rounded-lg bg-muted p-0.5"
    >
      {options.map((option) => (
        <ToggleButton
          key={option.id}
          id={option.id}
          className="relative h-7 cursor-default rounded-md px-3 text-[13px] font-medium text-muted-foreground outline-none transition-colors duration-150 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[hovered]:text-foreground data-[selected]:text-foreground"
        >
          {({ isSelected }) => (
            <>
              {isSelected ? (
                <motion.span
                  layoutId={pill}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md bg-card shadow-sm dark:bg-accent"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative">{option.label}</span>
            </>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

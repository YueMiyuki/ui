"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { type ComponentProps, type PointerEvent, useState } from "react";
import { Focusable, Tooltip, TooltipTrigger } from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { cn } from "@/lib/utils";

export interface AvatarTagsItem {
  id: string | number;
  name: string;
  designation: string;
  image: string;
}

export interface AvatarTagsProps extends Omit<ComponentProps<"div">, "children"> {
  items: AvatarTagsItem[];
}

const keyframes = `
@keyframes miyuki-avatar-tags-out { to { opacity: 0; } }
`;

const SIZE = 56;

function Person({ item, first }: { item: AvatarTagsItem; first: boolean }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const lean = useMotionValue(0);
  const eased = useSpring(lean, { stiffness: 260, damping: 20, mass: 0.6 });
  const rotate = useTransform(eased, [-1, 1], [-9, 9]);
  const x = useTransform(eased, [-1, 1], [-10, 10]);

  const follow = (e: PointerEvent<HTMLSpanElement>) => {
    if (reduce || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    lean.set(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))));
  };

  return (
    <TooltipTrigger delay={0} closeDelay={0} isOpen={open} onOpenChange={setOpen}>
      <Focusable>
        <span
          role="img"
          aria-label={item.name}
          onPointerEnter={follow}
          onPointerMove={follow}
          onPointerLeave={() => lean.set(0)}
          onFocus={() => lean.jump(0)}
          className={cn(
            "relative shrink-0 rounded-full outline-none",
            "transition-[translate,box-shadow] duration-200 ease-settle motion-reduce:transition-none",
            "hover:z-10 hover:-translate-y-1 focus-visible:z-10 focus-visible:-translate-y-1 focus-visible:ring-[6px] focus-visible:ring-ring",
            open && "z-10 -translate-y-1",
          )}
          style={{ marginInlineStart: first ? 0 : -SIZE / 4 }}
        >
          <Avatar
            src={item.image}
            name={item.name}
            size="xl"
            aria-hidden
            style={{ boxShadow: "0 0 0 3px var(--background)" }}
          />
        </span>
      </Focusable>
      <Tooltip
        placement="top"
        offset={14}
        className="pointer-events-none outline-none data-[exiting]:animate-[miyuki-avatar-tags-out_110ms_ease-in_forwards]"
      >
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            reduce ? { duration: 0.12 } : { type: "spring", stiffness: 500, damping: 24, opacity: { duration: 0.12 } }
          }
          style={reduce ? undefined : { rotate, x, transformOrigin: "50% calc(100% + 8px)" }}
          className="relative flex flex-col items-center rounded-lg bg-primary px-3 py-1.5 text-center whitespace-nowrap text-primary-foreground shadow-lg"
        >
          <span className="text-sm leading-5 font-medium">{item.name}</span>
          <span className="text-xs leading-4 text-primary-foreground/70">{item.designation}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 14 8"
            className="absolute top-full left-1/2 -mt-px h-2 w-3.5 -translate-x-1/2 fill-primary"
          >
            <path d="M0 0H14C10 0 9.6 2.6 9.6 4.6A2.6 2.6 0 0 1 4.4 4.6C4.4 2.6 4 0 0 0Z" />
          </svg>
        </motion.div>
      </Tooltip>
    </TooltipTrigger>
  );
}

export function AvatarTags({ items, className, ...props }: AvatarTagsProps) {
  return (
    <div role="group" {...props} className={cn("flex items-center", className)}>
      <style href="miyuki-avatar-tags" precedence="miyuki">
        {keyframes}
      </style>
      {items.map((item, i) => (
        <Person key={item.id} item={item} first={i === 0} />
      ))}
    </div>
  );
}

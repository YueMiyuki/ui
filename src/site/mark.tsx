"use client";

import { useEffect, useState } from "react";
import { MorphPath } from "@/components/miyuki-ui/path-morph";
import { cn } from "@/lib/utils";
import {
  type Branch,
  branchPath,
  branchPoints,
  collapsedBranches,
  type Drop,
  dropOutline,
  starOutline,
} from "@/site/snow";

const R = 9.2;
const DROP: Drop = { cx: 12, cy: 12.4, w: 10.2, h: 9.4, m: 1.25 };
const BRANCHES: Branch[] = [{ at: 0.58, length: 0.3, angle: 58 }];
const points = branchPoints(12, 12, R, BRANCHES);

const CRYSTAL_D = starOutline(12, 12, R, 0);
const DROP_D = dropOutline(DROP);
const BRANCHES_D = branchPath(points);
const ROOTS_D = collapsedBranches(points.map((p) => p.root));
const QUICK = { stiffness: 900, damping: 56 };

function Mark({ melted = false, className }: { melted?: boolean; className?: string }) {
  const [grown, setGrown] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setGrown(!melted), melted ? 0 : 160);
    return () => window.clearTimeout(id);
  }, [melted]);

  const branches = grown && !melted;

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <MorphPath d={melted ? DROP_D : CRYSTAL_D} />
      <MorphPath
        d={branches ? BRANCHES_D : ROOTS_D}
        transition={QUICK}
        className="transition-opacity duration-150 ease-settle"
        style={{ opacity: branches ? 1 : 0 }}
      />
    </svg>
  );
}

export function Wordmark({ melted, className }: { melted?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark melted={melted} />
      <span className="font-pixel text-[17px] leading-none">miyuki-ui</span>
    </span>
  );
}

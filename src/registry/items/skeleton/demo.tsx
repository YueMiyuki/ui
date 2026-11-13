"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Skeleton, SkeletonCircle, SkeletonReveal, SkeletonText } from "@/components/miyuki-ui/skeleton";
import { people } from "@/registry/lib/data";

const person = people[2];

export default function SkeletonDemo() {
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function load() {
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLoading(false), 1600);
  }

  useEffect(() => {
    timer.current = setTimeout(() => setLoading(false), 1600);
    return () => clearTimeout(timer.current);
  }, []);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-5">
      <div className="w-full rounded-xl border border-border bg-card p-5 shadow-sm">
        <SkeletonReveal
          loading={loading}
          skeleton={
            <>
              <div className="flex items-center gap-3">
                <SkeletonCircle size={48} />
                <div className="flex flex-col gap-2.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <SkeletonText lines={2} className="mt-4" />
              <Skeleton className="mt-4 h-8 w-36 rounded-lg" />
            </>
          }
        >
          <div className="flex items-center gap-3">
            <img src={person.avatar} alt="" className="size-12 rounded-full" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{person.name}</p>
              <p className="text-[13px] leading-5 text-muted-foreground">{person.role}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Writes the morning avalanche bulletin for the northern Alps from a desk in Hakuba.
          </p>
          <Button variant="secondary" size="sm" className="mt-4">
            Follow forecasts
          </Button>
        </SkeletonReveal>
      </div>
      <Button variant="ghost" size="sm" iconStart={<RotateCw />} isPending={loading} onPress={load}>
        Reload
      </Button>
    </div>
  );
}

"use client";

import { Check, Clock } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";

const tones: { tone: BadgeTone; label: string }[] = [
  { tone: "neutral", label: "Draft" },
  { tone: "brand", label: "Open" },
  { tone: "success", label: "On time" },
  { tone: "warning", label: "Delayed" },
  { tone: "destructive", label: "Cancelled" },
];

function Row({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-muted-foreground">{caption}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function BadgeDemo() {
  return (
    <div className="flex flex-col gap-5">
      <Row caption="Soft">
        {tones.map(({ tone, label }) => (
          <Badge key={tone} tone={tone}>
            {label}
          </Badge>
        ))}
      </Row>
      <Row caption="With a dot">
        {tones.map(({ tone, label }) => (
          <Badge key={tone} tone={tone} dot>
            {label}
          </Badge>
        ))}
      </Row>
      <Row caption="Solid, for counts">
        <Badge variant="solid" tone="brand" size="sm">
          12
        </Badge>
        <Badge variant="solid" tone="destructive" size="sm">
          3
        </Badge>
        <Badge variant="solid" size="sm">
          99+
        </Badge>
      </Row>
      <Row caption="Outline">
        {tones.map(({ tone, label }) => (
          <Badge
            key={tone}
            tone={tone}
            variant="outline"
            icon={tone === "success" ? <Check /> : tone === "warning" ? <Clock /> : undefined}
          >
            {label}
          </Badge>
        ))}
      </Row>
    </div>
  );
}

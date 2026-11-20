"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/miyuki-ui/card";

const passes = [
  { id: "afternoon", title: "Afternoon", description: "From 12:30, on every lift at Hakuba Goryu.", price: "¥4,800" },
  { id: "day", title: "Full day", description: "08:30 to 16:30, with night skiing on Saturdays.", price: "¥6,800" },
  { id: "three-day", title: "Three days", description: "Any three days in one week of the season.", price: "¥18,600" },
];

export default function CardSelectableDemo() {
  return (
    <div role="group" aria-label="Lift passes" className="@container w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
        {passes.map((pass) => (
          <Card key={pass.id} selectable name="pass" value={pass.id} defaultSelected={pass.id === "day"}>
            <CardHeader>
              <CardTitle>{pass.title}</CardTitle>
              <CardDescription>{pass.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <span className="text-xl font-semibold tracking-[-0.01em] tabular-nums">{pass.price}</span>
              <span className="ms-1.5 text-xs text-muted-foreground">per adult</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

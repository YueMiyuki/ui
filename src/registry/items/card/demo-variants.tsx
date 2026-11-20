"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type CardVariant,
} from "@/components/miyuki-ui/card";

const reports: { variant: CardVariant; town: string; summary: string; temperature: string; time: string }[] = [
  {
    variant: "default",
    town: "Hakuba",
    summary: "Light snow until noon, clearing by evening.",
    temperature: "−6°",
    time: "Summit, 07:00",
  },
  {
    variant: "outline",
    town: "Nozawa",
    summary: "Overcast and calm. The village baths are open until 23:00.",
    temperature: "−2°",
    time: "Village, 07:00",
  },
  {
    variant: "muted",
    town: "Niseko",
    summary: "Heavy snow overnight. Expect holds on the upper lifts.",
    temperature: "−9°",
    time: "Summit, 07:00",
  },
];

export default function CardVariantsDemo() {
  return (
    <div className="@container w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.variant} variant={report.variant}>
            <CardHeader>
              <CardTitle>{report.town}</CardTitle>
              <CardDescription>{report.summary}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex flex-col">
              <span className="font-display text-3xl leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {report.temperature}
              </span>
              <span className="mt-1.5 text-xs text-muted-foreground">{report.time}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

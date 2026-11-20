"use client";

import { Button } from "@/components/miyuki-ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardMedia,
  CardTitle,
} from "@/components/miyuki-ui/card";
import { landscape } from "@/registry/lib/art";

export default function CardDemo() {
  return (
    <Card className="w-full max-w-sm">
      <CardMedia
        src={landscape("happo-ridge-hut", { width: 768, height: 330, mood: "day" })}
        alt="A snowy ridge under a clear sky"
        aspect="21 / 9"
      />
      <CardHeader>
        <CardTitle>Happo ridge hut</CardTitle>
        <CardDescription>
          A stone hut on the ridge above Hakuba, two hours on foot from the top of the gondola.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-muted-foreground">Altitude</dt>
            <dd className="mt-0.5 font-medium tabular-nums">2,730 m</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Open</dt>
            <dd className="mt-0.5 font-medium">July to October</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter bordered>
        <div className="flex flex-col">
          <span className="text-base font-semibold tabular-nums">¥11,200</span>
          <span className="text-xs text-muted-foreground">a night, with dinner</span>
        </div>
        <Button className="ms-auto">Book a bed</Button>
      </CardFooter>
    </Card>
  );
}

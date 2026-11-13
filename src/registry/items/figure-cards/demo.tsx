"use client";

import { Eye, Mail, UserMinus, Users } from "lucide-react";
import { FigureCard, FigureCardGroup } from "@/components/miyuki-ui/figure-cards";

export default function FigureCardsDemo() {
  return (
    <FigureCardGroup className="max-w-4xl">
      <FigureCard
        label="Subscribers"
        value="12,840"
        delta={0.16}
        icon={<Users />}
        info="Accounts on a paid plan on the last day of the month."
      />
      <FigureCard
        label="Forecast views"
        value="1.94M"
        delta={0.128}
        icon={<Eye />}
        info="Forecast pages and widgets opened, across web and app."
      />
      <FigureCard
        label="Bulletins sent"
        value="1,286"
        delta={0.052}
        icon={<Mail />}
        info="Avalanche and storm bulletins delivered by email and push."
      />
      <FigureCard
        label="Churn"
        value="1.24%"
        delta={-0.003}
        invertDelta
        icon={<UserMinus />}
        info="Share of subscribers who cancelled during the month. Lower is better."
      />
    </FigureCardGroup>
  );
}

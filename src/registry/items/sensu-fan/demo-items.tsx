"use client";

import { Bath, CarTaxiFront, ConciergeBell, CupSoda, Sunrise, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { SensuFan } from "@/components/miyuki-ui/sensu-fan";

const services = [
  { id: "baths", label: "Baths", icon: <Bath />, note: "The outdoor bath is open until 23:00, and again from 05:30." },
  { id: "dinner", label: "Dinner", icon: <UtensilsCrossed />, note: "Dinner is served from 18:00 in the Kiri room." },
  { id: "tea", label: "Tea", icon: <CupSoda />, note: "Hōjicha and sweets are laid out in the lounge at 15:00." },
  { id: "breakfast", label: "Breakfast", icon: <Sunrise />, note: "Breakfast from 07:00 to 09:00, rice or toast." },
  {
    id: "taxi",
    label: "Taxi",
    icon: <CarTaxiFront />,
    note: "A taxi to Nozawa station takes 12 minutes. Ask at the desk.",
  },
  { id: "desk", label: "Front desk", icon: <ConciergeBell />, note: "The desk is staffed day and night. Dial 9." },
];

export default function SensuFanItems() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const note = services.find((s) => s.id === picked)?.note;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <SensuFan label="Inn services" open={open} onOpenChange={setOpen} items={services} onAction={setPicked} />
      <p aria-live="polite" className="min-h-5 max-w-sm text-center text-sm text-muted-foreground">
        {note ?? (open ? "Choose a service." : "Press the handle to open the fan.")}
      </p>
    </div>
  );
}

"use client";

import { Printer } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { ReceiptCard, type ReceiptCardHandle } from "@/components/miyuki-ui/receipt-card";

export default function ReceiptCardDemo() {
  const receipt = useRef<ReceiptCardHandle>(null);
  return (
    <div className="flex flex-col items-center gap-4">
      <ReceiptCard
        ref={receipt}
        aria-label="Receipt from Kiso tea house"
        title={
          <>
            Kiso tea house
            <span className="block text-xs font-normal opacity-75">Narai-juku, 14 Nov 2026, 15:12</span>
          </>
        }
        lines={[
          { label: "Sencha, Kiso 100 g", value: "¥1,620" },
          { label: "Hōjicha, roasted 80 g", value: "¥980" },
          { label: "Gyokuro, Yame 50 g", value: "¥2,160" },
          { label: "Paper filters, 50", value: "¥330" },
          { label: "Tax 8% on ¥4,760", value: "¥380", rule: true },
          { label: "Tax 10% on ¥330", value: "¥33" },
          { label: "Total", value: "¥5,503", bold: true, rule: true },
          { label: "Cash", value: "¥6,000" },
          { label: "Change", value: "¥497" },
        ]}
        footer="Thank you. Come back in spring."
        code="4912345678904"
      />
      <Button variant="secondary" size="sm" iconStart={<Printer />} onPress={() => receipt.current?.print()}>
        Print again
      </Button>
    </div>
  );
}

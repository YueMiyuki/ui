"use client";

import { Accordion, AccordionItem } from "@/components/miyuki-ui/accordion";

export default function AccordionSeparatedDemo() {
  return (
    <Accordion variant="separated" allowsMultipleExpanded className="max-w-xl" defaultExpandedKeys={["season"]}>
      <AccordionItem id="season" title="When does the winter season start?">
        The huts open on 20 December and close on 31 March. Exact dates depend on snow cover at the trailhead, and we
        post them on the first of December.
      </AccordionItem>
      <AccordionItem id="dogs" title="Can I bring my dog?">
        Dogs are welcome at Kurodake hut, which has a covered porch for them. The other huts do not allow pets indoors.
      </AccordionItem>
      <AccordionItem id="group" title="Do you take group bookings?">
        Groups of up to twelve can book a whole bunk room. Write to us with your dates and we will hold the room for 48
        hours while you confirm.
      </AccordionItem>
    </Accordion>
  );
}

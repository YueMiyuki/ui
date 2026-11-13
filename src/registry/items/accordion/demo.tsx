"use client";

import { Accordion, AccordionItem } from "@/components/miyuki-ui/accordion";

const questions = [
  {
    id: "arrival",
    title: "Can I arrive after dark?",
    answer:
      "Yes, as long as you tell the warden by 3 pm on the day. The trail from the last bus stop is marked with reflectors, but it takes about forty minutes longer in the dark. Bring a head torch with spare batteries.",
  },
  {
    id: "packing",
    title: "What should I bring?",
    answer:
      "A sleeping bag liner, indoor slippers and your own towel. Blankets and pillows are provided. There is no shop, so carry snacks and anything you need for the morning.",
  },
  {
    id: "dinner",
    title: "Is dinner included?",
    answer:
      "Dinner and breakfast are included in every booking. Dinner is served at 6 pm in the common room. Tell us about allergies when you book and the kitchen will plan around them.",
  },
  {
    id: "cancel",
    title: "How do I cancel?",
    answer:
      "Open the booking from your confirmation email and choose Cancel booking. Cancellations more than seven days ahead are refunded in full. After that we keep ¥2,000 per person for the meals already ordered.",
  },
  {
    id: "heating",
    title: "Are the huts heated?",
    answer:
      "Every hut has a wood stove in the common room, lit from 4 pm until bedtime. The bunk rooms are not heated, so expect around 8 °C overnight in January.",
  },
];

export default function AccordionDemo() {
  return (
    <Accordion className="max-w-xl" defaultExpandedKeys={["packing"]}>
      {questions.map((q) => (
        <AccordionItem key={q.id} id={q.id} title={q.title}>
          {q.answer}
        </AccordionItem>
      ))}
    </Accordion>
  );
}

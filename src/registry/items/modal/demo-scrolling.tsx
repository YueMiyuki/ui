"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import {
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/miyuki-ui/modal";

const terms = [
  {
    title: "Bookings",
    text: "A place on a guided trip is held once the deposit of ¥12,000 is paid. The balance is due 21 days before the first day. We send a reminder a week before it falls due, by email and in the app.",
  },
  {
    title: "Weather and snow",
    text: "Our guides decide each morning whether a route goes ahead, using the avalanche bulletin, the overnight snowfall and their own pit tests. If a day is cancelled for conditions we offer another route of the same grade, a place on a later date, or a refund for that day.",
  },
  {
    title: "Cancelling",
    text: "Cancel more than 30 days ahead and we return everything except the deposit. Between 30 and 8 days we keep half of the trip price. Inside a week we cannot refund, but you may pass your place to a friend who meets the grade.",
  },
  {
    title: "Equipment",
    text: "Avalanche transceiver, shovel and probe are required on every winter route and can be borrowed from the shop in Hakuba at no charge. Skis, skins and boots are yours to bring or rent. Your guide checks every transceiver at the trailhead.",
  },
  {
    title: "Fitness and grades",
    text: "Each route carries a grade from one to four. Grade three and above assume you can climb 1,100 metres in a day with a pack and ski variable snow in control. If your guide judges that the group is moving too slowly to return safely, the day will turn early.",
  },
  {
    title: "Insurance",
    text: "You need travel insurance that covers off-piste skiing and mountain rescue in Japan. Please bring the policy number on the first morning; we cannot take you out without it.",
  },
  {
    title: "Photographs",
    text: "Guides sometimes take photographs on the hill. We only use them on our own pages, and never where you can be recognised unless you say yes on the day.",
  },
];

export default function ModalScrollingDemo() {
  return (
    <ModalTrigger>
      <Button variant="secondary" iconStart={<FileText />}>
        Read trip terms
      </Button>
      <Modal size="md">
        <ModalHeader>
          <ModalTitle>Guided trip terms</ModalTitle>
          <ModalDescription>Kitakaze Outfitters · Updated 3 November 2026</ModalDescription>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-5 py-4">
          {terms.map((term) => (
            <section key={term.title} className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-foreground">{term.title}</h3>
              <p className="text-pretty text-muted-foreground">{term.text}</p>
            </section>
          ))}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" slot="close">
            Not now
          </Button>
          <Button slot="close">Accept terms</Button>
        </ModalFooter>
      </Modal>
    </ModalTrigger>
  );
}

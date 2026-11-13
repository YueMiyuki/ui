"use client";

import { Button } from "@/components/miyuki-ui/button";
import {
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  type ModalSize,
  ModalTitle,
  ModalTrigger,
} from "@/components/miyuki-ui/modal";
import { landscape } from "@/registry/lib/art";

const sizes: { size: ModalSize; label: string }[] = [
  { size: "sm", label: "Small" },
  { size: "md", label: "Medium" },
  { size: "lg", label: "Large" },
  { size: "full", label: "Full" },
];

export default function ModalSizesDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {sizes.map(({ size, label }) => (
        <ModalTrigger key={size}>
          <Button variant="secondary">{label}</Button>
          <Modal size={size}>
            <ModalHeader>
              <ModalTitle>Kiso valley, day two</ModalTitle>
              <ModalDescription>Tsumago to Magome on the old Nakasendō, 7.8 km.</ModalDescription>
            </ModalHeader>
            <ModalBody className="flex flex-col">
              <img
                src={landscape("kiso", { width: 960, height: 540, mood: "snow" })}
                alt="Snow on the ridges above the Kiso valley"
                className={
                  size === "full"
                    ? "min-h-0 w-full flex-1 rounded-lg object-cover"
                    : "aspect-video w-full rounded-lg object-cover"
                }
              />
            </ModalBody>
            <ModalFooter>
              <Button slot="close">Done</Button>
            </ModalFooter>
          </Modal>
        </ModalTrigger>
      ))}
    </div>
  );
}

"use client";

import { CloudSnow } from "lucide-react";
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

export default function ModalBlurDemo() {
  return (
    <ModalTrigger>
      <Button variant="secondary" iconStart={<CloudSnow />}>
        Snow report
      </Button>
      <Modal backdropBlur>
        <ModalHeader>
          <ModalTitle>Hakuba, this morning</ModalTitle>
          <ModalDescription>Posted at 06:40 by the ski patrol at Happo-one.</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <p>
            18 cm of new snow overnight on a 212 cm base. The upper lifts open at 08:30, and the Kokusai gondola stays
            on wind hold until noon.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button slot="close">Done</Button>
        </ModalFooter>
      </Modal>
    </ModalTrigger>
  );
}

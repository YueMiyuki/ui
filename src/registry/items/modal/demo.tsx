"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/miyuki-ui/button";
import { TextField } from "@/components/miyuki-ui/input";
import {
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/miyuki-ui/modal";

export default function ModalDemo() {
  return (
    <ModalTrigger>
      <Button variant="secondary" iconStart={<Pencil />}>
        Rename route
      </Button>
      <Modal>
        {({ close }) => (
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              close();
            }}
          >
            <ModalHeader>
              <ModalTitle>Rename this route</ModalTitle>
              <ModalDescription>
                Everyone on the Hakuba trip will see the new name the next time they open the map.
              </ModalDescription>
            </ModalHeader>
            <ModalBody>
              <TextField label="Route name" defaultValue="Hakuba traverse" autoFocus isRequired />
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" slot="close">
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </ModalTrigger>
  );
}

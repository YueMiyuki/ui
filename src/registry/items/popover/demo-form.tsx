"use client";

import { Bell } from "lucide-react";
import { Form, Heading } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { TextField } from "@/components/miyuki-ui/input";
import { Popover, PopoverTrigger } from "@/components/miyuki-ui/popover";

export default function PopoverFormDemo() {
  return (
    <PopoverTrigger>
      <Button variant="secondary" iconStart={<Bell />}>
        Snow alert
      </Button>
      <Popover placement="bottom start" className="w-72">
        {({ close }) => (
          <Form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              close();
            }}
          >
            <Heading slot="title" className="text-sm leading-5 font-semibold text-foreground">
              Alert me about Hakuba
            </Heading>
            <TextField
              label="When new snow is over"
              description="One message a day, at 06:30."
              defaultValue="20"
              inputMode="numeric"
              pattern="[0-9]*"
              suffix="cm"
              autoFocus
              isRequired
            />
            <Button type="submit" className="self-end">
              Save alert
            </Button>
          </Form>
        )}
      </Popover>
    </PopoverTrigger>
  );
}

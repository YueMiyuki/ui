"use client";

import { TextArea } from "@/components/miyuki-ui/textarea";

export default function TextAreaDemo() {
  return (
    <TextArea
      className="w-full max-w-md"
      label="Trip notes"
      placeholder="Snow conditions, who you met, what you would do differently."
      maxLength={240}
      defaultValue="Fresh powder above the Happo-one gondola until noon, then wind crust on the north faces. Lars from ski patrol pointed us to the tree runs off the Kokusai lift."
    />
  );
}

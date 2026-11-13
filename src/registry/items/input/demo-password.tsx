"use client";

import { useState } from "react";
import { ToggleButton } from "react-aria-components";
import { TextField } from "@/components/miyuki-ui/input";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";

export default function InputPasswordDemo() {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      className="w-full max-w-sm"
      label="Password"
      type={visible ? "text" : "password"}
      autoComplete="current-password"
      defaultValue="otaru-canal-1284"
      description="At least 12 characters."
      action={
        <ToggleButton isSelected={visible} onChange={setVisible} aria-label="Show password">
          <MorphIcon shapes={morphIcons.eyeOpenClosed} shape={visible ? "open" : "closed"} size={16} />
        </ToggleButton>
      }
    />
  );
}

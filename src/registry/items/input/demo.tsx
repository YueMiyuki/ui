"use client";

import { Mail } from "lucide-react";
import { TextField } from "@/components/miyuki-ui/input";

export default function InputDemo() {
  return (
    <TextField
      className="w-full max-w-sm"
      label="Email"
      type="email"
      autoComplete="email"
      placeholder="you@example.com"
      iconStart={<Mail />}
      description="We only write when the forecast changes."
    />
  );
}

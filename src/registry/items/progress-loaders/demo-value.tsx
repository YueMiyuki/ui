"use client";

import { useState } from "react";
import {
  CapsuleLoader,
  CheckLoader,
  CountLoader,
  PieLoader,
  SpokesLoader,
  StepsLoader,
} from "@/components/miyuki-ui/progress-loaders";
import { Slider } from "@/components/miyuki-ui/slider";

export default function ProgressLoadersValueDemo() {
  const [value, setValue] = useState(64);
  const label = "Downloading offline maps";
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-10">
      <div className="grid grid-cols-3 place-items-center gap-x-8 gap-y-6 sm:flex sm:items-center sm:gap-x-7">
        <SpokesLoader size={32} value={value} label={label} />
        <CountLoader size={32} value={value} label={label} />
        <CapsuleLoader size={32} value={value} label={label} />
        <PieLoader size={32} value={value} label={label} />
        <StepsLoader size={32} value={value} label={label} />
        <CheckLoader size={32} value={value} label={label} />
      </div>
      <Slider
        label="Download"
        value={value}
        onChange={setValue}
        formatOptions={{ style: "unit", unit: "percent" }}
        className="max-w-xs"
      />
    </div>
  );
}

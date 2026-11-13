"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { SignaturePad, type SignaturePadHandle } from "@/components/miyuki-ui/signature-pad";

export default function SignaturePadDemo() {
  const pad = useRef<SignaturePadHandle>(null);
  const [strokes, setStrokes] = useState(0);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-3">
      <SignaturePad
        ref={pad}
        label="Sign the hut register"
        height={200}
        onChange={(s) => setStrokes(s.length)}
        onNameChange={setName}
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-muted-foreground">Hakuba Sansō, 14 February. Leaving for the col at 05:40.</p>
        <Button
          size="sm"
          isDisabled={strokes === 0 && name === ""}
          onPress={() => setSaved(pad.current?.toDataURL() ?? null)}
        >
          Save
        </Button>
      </div>
      {saved && (
        <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
          <img src={saved} alt="Saved signature" className="h-9 w-auto" />
          <span className="text-[13px] text-muted-foreground">Added to the register</span>
        </div>
      )}
    </div>
  );
}

"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { InputOTP } from "@/components/miyuki-ui/input-otp";
import { LinkButton } from "@/components/miyuki-ui/link-button";

const SENT = "482913";

export default function InputOTPDemo() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "wrong" | "ok">("idle");
  const [wait, setWait] = useState(24);

  useEffect(() => {
    if (wait === 0) return;
    const t = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  return (
    <div className="flex flex-col gap-3">
      <InputOTP
        label="Enter the code we sent to haruka@shirakaba.example"
        groups={[3, 3]}
        value={code}
        onChange={(next) => {
          setCode(next);
          setStatus("idle");
        }}
        onComplete={(full) => setStatus(full === SENT ? "ok" : "wrong")}
        isInvalid={status === "wrong"}
        errorMessage="That code does not match. Check the latest message."
      />
      {status === "ok" ? (
        <p className="flex items-center gap-1.5 text-[13px] text-success-strong">
          <CircleCheck aria-hidden="true" className="size-3.5" />
          Email confirmed.
        </p>
      ) : wait > 0 ? (
        <p className="text-[13px] text-muted-foreground tabular-nums">
          Resend code in 0:{String(wait).padStart(2, "0")}
        </p>
      ) : (
        <LinkButton tone="brand" size="sm" className="self-start" onPress={() => setWait(24)}>
          Resend code
        </LinkButton>
      )}
    </div>
  );
}

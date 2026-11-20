"use client";

import { Button } from "@/components/miyuki-ui/button";
import { TextField } from "@/components/miyuki-ui/input";
import { PasswordField } from "@/components/miyuki-ui/password-field";

export default function PasswordFieldDemo() {
  return (
    <form className="flex w-full max-w-sm flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
      <TextField label="Email" type="email" autoComplete="email" defaultValue="aiko@kitakaze.example" />
      <PasswordField label="Password" defaultValue="Otaru-canal" />
      <Button type="submit" className="mt-1">
        Create account
      </Button>
    </form>
  );
}

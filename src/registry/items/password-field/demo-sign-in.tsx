"use client";

import { Button } from "@/components/miyuki-ui/button";
import { TextField } from "@/components/miyuki-ui/input";
import { LinkButton } from "@/components/miyuki-ui/link-button";
import { PasswordField } from "@/components/miyuki-ui/password-field";

export default function PasswordFieldSignInDemo() {
  return (
    <form className="flex w-full max-w-sm flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
      <TextField label="Email" type="email" autoComplete="email" defaultValue="k.mori@northline.example" />
      <PasswordField
        label="Password"
        purpose="current"
        labelAction={<LinkButton size="sm">Forgot password?</LinkButton>}
      />
      <Button type="submit" className="mt-1">
        Sign in
      </Button>
    </form>
  );
}

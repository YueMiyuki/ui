"use client";

import { SocialButton } from "@/components/miyuki-ui/social-button";

export default function SocialButtonDemo() {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2.5">
      <SocialButton provider="google" className="w-full" />
      <SocialButton provider="apple" className="w-full" />
      <SocialButton provider="github" className="w-full" />
    </div>
  );
}

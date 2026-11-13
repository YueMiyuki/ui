"use client";

import { SocialButton, type SocialProvider } from "@/components/miyuki-ui/social-button";

const providers: SocialProvider[] = ["line", "yahoo", "apple", "google", "kakao", "discord"];

export default function SocialButtonSolidDemo() {
  return (
    <div className="grid w-full max-w-lg gap-2.5 sm:grid-cols-2">
      {providers.map((provider) => (
        <SocialButton key={provider} provider={provider} variant="solid" className="w-full" />
      ))}
    </div>
  );
}

"use client";

import { SocialButton, type SocialProvider, socialProviders } from "@/components/miyuki-ui/social-button";

const providers = Object.keys(socialProviders) as SocialProvider[];

export default function SocialButtonAllDemo() {
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {providers.map((provider) => (
        <SocialButton key={provider} provider={provider} variant="icon" />
      ))}
    </div>
  );
}

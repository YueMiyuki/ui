"use client";

import { TagInput } from "@/components/miyuki-ui/tag-input";

const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function TagInputDemo() {
  return (
    <TagInput
      className="w-full max-w-md"
      label="Invite to the Hakuba trip"
      description="Everyone you invite can see the itinerary and the hut bookings."
      placeholder="name@example.com"
      defaultValue={["aiko@kitakaze.example", "lars@kitakaze.example", "k.mori@northline"]}
      validate={(tag) => email.test(tag) || `${tag} is not a complete email address.`}
    />
  );
}

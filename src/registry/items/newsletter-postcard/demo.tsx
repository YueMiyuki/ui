"use client";

import { NewsletterPostcard } from "@/components/miyuki-ui/newsletter-postcard";
import { landscape } from "@/registry/lib/art";

export default function NewsletterPostcardDemo() {
  return (
    <NewsletterPostcard
      title="One letter a week from the mountains."
      signature="Aiko Tanaka, Shirouma hut"
      submitLabel="Post it"
      stamp={landscape("postcard-stamp-shirouma", { mood: "dawn", width: 144, height: 176 })}
      stampAlt="Shirouma at dawn"
      postmark="Hakuba"
      imprint="Printed on snow paper in Otaru"
      onSubmit={() => new Promise((resolve) => setTimeout(resolve, 700))}
    >
      <p>
        Every Friday, a short letter from the hut: what fell overnight, which ridges are holding, and one route worth
        the early start. No more than five minutes to read.
      </p>
    </NewsletterPostcard>
  );
}

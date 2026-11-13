"use client";

import { TestimonialStack } from "@/components/miyuki-ui/testimonial-stack";
import { avatar } from "@/registry/lib/art";
import { people, quotes } from "@/registry/lib/data";

const testimonials = ["Lars Eriksen", "Kenji Mori", "Élodie Martin", "Ingrid Solberg"].map((name) => {
  const person = people.find((p) => p.name === name)!;
  const quote = quotes.find((q) => q.name === name)!;
  return { quote: quote.text, name, designation: person.role, src: avatar(person.handle, 480) };
});

export default function TestimonialStackDemo() {
  return <TestimonialStack testimonials={testimonials} aria-label="What our guests say" className="max-w-4xl" />;
}

"use client";

import { TeaShop } from "@/components/miyuki-ui/tea-shop";
import { abstract, landscape } from "@/registry/lib/art";

function image(key: string) {
  if (key === "hero") return landscape("yukimuro-snow-room", { mood: "snow", width: 1400, height: 700 });
  const [id, part] = key.split(":");
  if (part === "farm") return landscape(`tea-garden-${id}`, { mood: "dawn", width: 1000, height: 800 });
  return abstract(part ? `${id}-${part}` : `tea-${id}`, { width: 800, height: 800 });
}

export default function TeaShopDemo() {
  return <TeaShop image={image} />;
}

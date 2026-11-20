"use client";

import { type Framework, FrameworkProvider } from "fumadocs-core/framework";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const NextLink = Link as unknown as Framework["Link"];
const NextImage = Image as unknown as Framework["Image"];

function useBrowserPathname() {
  const pathname = usePathname();
  return pathname === "/en" || pathname.startsWith("/en/") ? pathname.slice(3) || "/" : pathname;
}

export function SiteFramework({ children }: { children: ReactNode }) {
  return (
    <FrameworkProvider
      usePathname={useBrowserPathname}
      useRouter={useRouter}
      useParams={useParams}
      Link={NextLink}
      Image={NextImage}
    >
      {children}
    </FrameworkProvider>
  );
}

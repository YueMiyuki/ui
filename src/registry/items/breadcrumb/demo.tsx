"use client";

import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";

export default function BreadcrumbDemo() {
  return (
    <Breadcrumbs>
      <Breadcrumb href="#home">Home</Breadcrumb>
      <Breadcrumb href="#regions">Regions</Breadcrumb>
      <Breadcrumb>Hokkaido</Breadcrumb>
    </Breadcrumbs>
  );
}

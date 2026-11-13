"use client";

import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";

export default function BreadcrumbCollapsedDemo() {
  return (
    <Breadcrumbs maxItems={4}>
      <Breadcrumb href="#home">Home</Breadcrumb>
      <Breadcrumb href="#regions">Regions</Breadcrumb>
      <Breadcrumb href="#hokkaido">Hokkaido</Breadcrumb>
      <Breadcrumb href="#niseko">Niseko</Breadcrumb>
      <Breadcrumb href="#hirafu">Hirafu</Breadcrumb>
      <Breadcrumb>Lift 4</Breadcrumb>
    </Breadcrumbs>
  );
}

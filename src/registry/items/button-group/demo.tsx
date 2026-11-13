"use client";

import { ButtonGroup, ButtonGroupItem } from "@/components/miyuki-ui/button-group";

export default function ButtonGroupDemo() {
  return (
    <ButtonGroup
      aria-label="Forecast range"
      selectionMode="single"
      disallowEmptySelection
      defaultSelectedKeys={["week"]}
    >
      <ButtonGroupItem id="day">Day</ButtonGroupItem>
      <ButtonGroupItem id="week">Week</ButtonGroupItem>
      <ButtonGroupItem id="month">Month</ButtonGroupItem>
    </ButtonGroup>
  );
}

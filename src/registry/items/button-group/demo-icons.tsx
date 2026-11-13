"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { ButtonGroup, ButtonGroupItem } from "@/components/miyuki-ui/button-group";

export default function ButtonGroupIconsDemo() {
  return (
    <ButtonGroup aria-label="Text alignment" selectionMode="multiple" defaultSelectedKeys={["left"]}>
      <ButtonGroupItem id="left" aria-label="Align left" iconStart={<AlignLeft aria-hidden="true" />} />
      <ButtonGroupItem id="center" aria-label="Align centre" iconStart={<AlignCenter aria-hidden="true" />} />
      <ButtonGroupItem id="right" aria-label="Align right" iconStart={<AlignRight aria-hidden="true" />} />
    </ButtonGroup>
  );
}

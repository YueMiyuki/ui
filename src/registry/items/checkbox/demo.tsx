"use client";

import { useState } from "react";
import { CheckboxGroupStateContext } from "react-aria-components";
import { Checkbox, CheckboxGroup } from "@/components/miyuki-ui/checkbox";

const alerts = [
  { value: "powder", label: "Powder alerts" },
  { value: "avalanche", label: "Avalanche bulletins" },
  { value: "lifts", label: "Lift status" },
];

export default function CheckboxDemo() {
  const [selected, setSelected] = useState<string[]>(["avalanche"]);
  const all = selected.length === alerts.length;
  const some = selected.length > 0 && !all;

  return (
    <CheckboxGroup label="Send me" value={selected} onChange={setSelected} className="w-64">
      <CheckboxGroupStateContext value={null}>
        <Checkbox
          isSelected={all}
          isIndeterminate={some}
          onChange={(on) => setSelected(on ? alerts.map((a) => a.value) : [])}
        >
          All notifications
        </Checkbox>
      </CheckboxGroupStateContext>
      <div className="flex flex-col gap-3 ps-7">
        {alerts.map((alert) => (
          <Checkbox key={alert.value} value={alert.value}>
            {alert.label}
          </Checkbox>
        ))}
      </div>
    </CheckboxGroup>
  );
}

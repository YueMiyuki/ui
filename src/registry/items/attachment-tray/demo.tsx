"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttachmentTray, type AttachmentTrayItem } from "@/components/miyuki-ui/attachment-tray";
import { Button } from "@/components/miyuki-ui/button";
import { PromptBox } from "@/components/miyuki-ui/prompt-box";
import { landscape } from "@/registry/lib/art";

const starting: AttachmentTrayItem[] = [
  {
    id: "ridge",
    name: "hakuba-ridge.jpg",
    type: "image/jpeg",
    src: landscape("hakuba-ridge", { width: 160, height: 160, mood: "day" }),
  },
  { id: "payroll", name: "payroll.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { id: "timetable", name: "timetable.pdf", type: "application/pdf" },
  { id: "presentation", name: "presentation.key", type: "application/x-iwork-keynote-sffkey" },
  { id: "route", name: "route.gpx", type: "application/gpx+xml" },
];

const more: Omit<AttachmentTrayItem, "id">[] = [
  { name: "hut-availability-february.csv", type: "text/csv" },
  {
    name: "tsugaike-at-dawn.jpg",
    type: "image/jpeg",
    src: landscape("tsugaike", { width: 160, height: 160, mood: "dawn" }),
  },
  { name: "avalanche-bulletin-0214.pdf", type: "application/pdf" },
  { name: "packing-list.md", type: "text/markdown" },
];

export default function AttachmentTrayDemo() {
  const [files, setFiles] = useState(starting);
  const added = useRef(0);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const addSample = () => {
    const next = more[added.current % more.length];
    added.current += 1;
    setFiles((list) => [...list, { ...next, id: `sample-${added.current}` }]);
  };

  const addReal = (picked: File[]) => {
    const next = picked.map((file, i) => {
      const src = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      if (src) urls.current.push(src);
      return { id: `picked-${Date.now()}-${i}`, name: file.name, type: file.type, src };
    });
    setFiles((list) => [...list, ...next]);
  };

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-4">
      <PromptBox placeholder="Ask about these files" canSend={files.length > 0} onAttach={addReal}>
        <AttachmentTray files={files} onRemove={(id) => setFiles((list) => list.filter((f) => f.id !== id))} />
      </PromptBox>
      <Button variant="secondary" size="sm" iconStart={<Plus />} onPress={addSample}>
        Add file
      </Button>
    </div>
  );
}

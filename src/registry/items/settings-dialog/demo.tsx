"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { SettingsDialog, type SettingsSection } from "@/components/miyuki-ui/settings-dialog";
import { landscape } from "@/registry/lib/art";

const ridge = landscape("hakuba", { width: 480, height: 320, mood: "dawn" });

export default function SettingsDialogDemo() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("general");

  return (
    <>
      <Button variant="secondary" iconStart={<Settings />} onPress={() => setOpen(true)}>
        Open settings
      </Button>
      <SettingsDialog
        isOpen={open}
        onOpenChange={setOpen}
        section={section}
        onSectionChange={setSection}
        plan={{ image: ridge }}
      />
    </>
  );
}

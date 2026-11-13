"use client";

import { Archive, Copy, Folder, FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownSubmenu,
} from "@/components/miyuki-ui/dropdown";
import { IconButton } from "@/components/miyuki-ui/icon-button";

export default function DropdownActionsDemo() {
  return (
    <Dropdown>
      <IconButton variant="secondary" aria-label="Route actions">
        <MoreHorizontal />
      </IconButton>
      <DropdownMenu aria-label="Route actions">
        <DropdownItem icon={<Pencil />}>Rename</DropdownItem>
        <DropdownItem icon={<Copy />} shortcut="⌘D">
          Duplicate
        </DropdownItem>
        <DropdownSubmenu>
          <DropdownItem icon={<FolderInput />}>Move to</DropdownItem>
          <DropdownMenu aria-label="Folders">
            <DropdownItem icon={<Folder />}>Winter 2026</DropdownItem>
            <DropdownItem icon={<Folder />}>Hakuba with Aiko</DropdownItem>
            <DropdownItem icon={<Archive />}>Archive</DropdownItem>
          </DropdownMenu>
        </DropdownSubmenu>
        <DropdownSeparator />
        <DropdownItem icon={<Trash2 />} tone="destructive">
          Delete
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

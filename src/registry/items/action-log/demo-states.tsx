import { type ActionItem, ActionLog } from "@/components/miyuki-ui/action-log";

const items: ActionItem[] = [
  { id: "1", kind: "search", label: "Searched", detail: "avalanche risk Hakuba", status: "done" },
  { id: "2", kind: "read", label: "Could not read", detail: "bulletin-0214.pdf", status: "failed" },
  { id: "3", kind: "run", label: "Book huts", detail: "huts --near happo --night 14", status: "skipped" },
  { id: "4", kind: "write", label: "Writing", detail: "packing-list.md", status: "running" },
];

export default function ActionLogStatesDemo() {
  return (
    <div className="w-full max-w-[460px]">
      <ActionLog items={items} aria-label="What the route planner has done" />
    </div>
  );
}

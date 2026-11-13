"use client";

import { useMemo, useState } from "react";
import type { SortDescriptor } from "react-aria-components";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Badge, type BadgeTone } from "@/components/miyuki-ui/badge";
import { Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/miyuki-ui/table";
import { people } from "@/registry/lib/data";

type Status = "Active" | "Invited" | "On leave" | "Inactive";

const tones: Record<Status, BadgeTone> = {
  Active: "success",
  Invited: "brand",
  "On leave": "warning",
  Inactive: "neutral",
};

const team: { status: Status; minutes: number }[] = [
  { status: "Active", minutes: 3 },
  { status: "Active", minutes: 48 },
  { status: "On leave", minutes: 8_640 },
  { status: "Active", minutes: 190 },
  { status: "Invited", minutes: 2_880 },
  { status: "Active", minutes: 12 },
  { status: "Inactive", minutes: 64_800 },
  { status: "Active", minutes: 1_320 },
  { status: "Invited", minutes: 4_410 },
  { status: "On leave", minutes: 21_600 },
];

const rows = team.map((entry, i) => ({ ...people[i], ...entry }));

function ago(minutes: number) {
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)} hr ago`;
  if (minutes < 2_880) return "Yesterday";
  if (minutes < 10_080) return `${Math.round(minutes / 1_440)} days ago`;
  if (minutes < 43_200) return `${Math.round(minutes / 10_080)} weeks ago`;
  return `${Math.round(minutes / 43_200)} months ago`;
}

export default function TableDemo() {
  const [sort, setSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });

  const sorted = useMemo(() => {
    const list = [...rows].sort((a, b) =>
      sort.column === "active" ? a.minutes - b.minutes : a.name.localeCompare(b.name),
    );
    return sort.direction === "descending" ? list.reverse() : list;
  }, [sort]);

  return (
    <Table
      aria-label="Team"
      selectionMode="multiple"
      sortDescriptor={sort}
      onSortChange={setSort}
      maxHeight={320}
      className="max-w-3xl"
    >
      <TableHeader>
        <Column id="name" isRowHeader allowsSorting>
          Name
        </Column>
        <Column id="status">Status</Column>
        <Column id="active" allowsSorting>
          Last active
        </Column>
      </TableHeader>
      <TableBody items={sorted}>
        {(person) => (
          <Row id={person.handle}>
            <Cell>
              <span className="flex items-center gap-3">
                <Avatar src={person.avatar} name={person.name} aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{person.name}</span>
                  <span className="truncate text-[13px] text-muted-foreground">{person.role}</span>
                </span>
              </span>
            </Cell>
            <Cell>
              <Badge tone={tones[person.status]} size="sm" dot>
                {person.status}
              </Badge>
            </Cell>
            <Cell className="whitespace-nowrap text-muted-foreground">{ago(person.minutes)}</Cell>
          </Row>
        )}
      </TableBody>
    </Table>
  );
}

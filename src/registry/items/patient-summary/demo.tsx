"use client";

import { PatientSummary } from "@/components/miyuki-ui/patient-summary";
import { people } from "@/registry/lib/data";

const avatars = Object.fromEntries(people.map((p) => [p.name, p.avatar]));

export default function PatientSummaryDemo() {
  return <PatientSummary avatars={avatars} />;
}

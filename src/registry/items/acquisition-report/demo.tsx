"use client";

import { AcquisitionReport } from "@/components/miyuki-ui/acquisition-report";
import { people } from "@/registry/lib/data";

const mei = people[4];

export default function AcquisitionReportDemo() {
  return <AcquisitionReport user={{ name: mei.name, email: "mei@shirakaba.example", avatar: mei.avatar }} />;
}

"use client";

import { useState } from "react";
import { Pagination } from "@/components/miyuki-ui/pagination";

export default function PaginationDemo() {
  const [page, setPage] = useState(3);
  return <Pagination page={page} onChange={setPage} total={20} />;
}

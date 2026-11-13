"use client";

import { createRng } from "@/components/miyuki-ui/lib/prng";
import { YearGrid } from "@/components/miyuki-ui/year-grid";

const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const season = [1.55, 1.6, 1.3, 0.85, 0.6, 0.5, 0.6, 0.5, 0.6, 0.8, 1.05, 1.45];
const rest = [0.12, 0.1, 0.14, 0.24, 0.3, 0.36, 0.34, 0.38, 0.32, 0.24, 0.18, 0.12];
const weekend = [1, 1.04, 1, 1.04, 1.1, 1.32, 1.26];
const firstWeekday = 3;

function reports(total: number) {
  const rng = createRng("reports-2026");
  const raw: number[] = [];
  lengths.forEach((length, m) => {
    for (let d = 1; d <= length; d++) {
      const i = raw.length;
      const off = rng() < rest[m];
      const storm = m < 3 || m === 11 ? (rng() < 0.08 ? rng.range(1.8, 2.6) : 1) : 1;
      raw.push(off ? 0 : season[m] * weekend[(firstWeekday + i) % 7] * storm * rng.range(0.45, 1.5));
    }
  });
  const day = (m: number, d: number) => lengths.slice(0, m).reduce((a, b) => a + b, 0) + d - 1;
  for (let i = day(1, 9); i <= day(2, 3); i++) raw[i] ||= season[1] * 0.8;
  raw[day(1, 8)] = 0;
  raw[day(2, 4)] = 0;
  for (let i = day(7, 10); i <= day(7, 19); i++) raw[i] = 0;
  raw[day(11, 25)] = 0;
  for (let i = day(11, 26); i <= day(11, 31); i++) raw[i] ||= season[11];
  raw[day(0, 22)] = season[0] * 3.4;

  let run = 0;
  raw.forEach((v, i) => {
    run = v > 0 ? run + 1 : 0;
    const protectedRun = i >= day(1, 9) && i <= day(2, 3);
    if (run > 16 && !protectedRun) {
      raw[i] = 0;
      run = 0;
    }
  });

  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((v) => (v > 0 ? Math.max(1, Math.round((v / sum) * total)) : 0));
  let diff = total - out.reduce((a, b) => a + b, 0);
  for (let i = 0; diff !== 0 && i < out.length * 4; i++) {
    const k = (i * 7919) % out.length;
    if (out[k] > 1 || (diff > 0 && out[k] > 0)) {
      out[k] += Math.sign(diff);
      diff -= Math.sign(diff);
    }
  }
  return out;
}

const data = reports(958);

export default function YearGridDemo() {
  return (
    <YearGrid
      className="w-full max-w-[640px]"
      label="Reports this year"
      value="958"
      delta={0.148}
      name="Reports"
      year={2026}
      data={data}
    />
  );
}

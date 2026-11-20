"use client";

import { FileText, Hash } from "lucide-react";
import { useRef, useState } from "react";
import { SearchBar, type SearchBarItem } from "@/components/miyuki-ui/search-bar";

const reports: { id: string; title: string; area: string; date: string; summary: string; notes: string[][] }[] = [
  {
    id: "happo-ridge",
    title: "Happō-one ridge",
    area: "Hakuba",
    date: "14 Feb",
    summary: "Wind-packed snow above the second lift. The ridge path is marked to the hut, with poles every 30 m.",
    notes: [
      ["Snow depth", "2.4 m at the summit station, 1.1 m at the base."],
      ["Wind", "Gusts of 40 km/h on the ridge after noon."],
    ],
  },
  {
    id: "tsugaike-loop",
    title: "Tsugaike plateau loop",
    area: "Hakuba",
    date: "13 Feb",
    summary: "Firm in the morning, heavy by two. Snowshoes recommended past the boardwalk.",
    notes: [
      ["Snowshoes", "For hire at the gondola top station until 15:00."],
      ["Boardwalk", "Buried; follow the orange poles."],
    ],
  },
  {
    id: "kenashi-forest",
    title: "Kenashi forest trail",
    area: "Nozawa Onsen",
    date: "12 Feb",
    summary: "Deep powder under the beeches after two days of snowfall. Breaking trail is slow going.",
    notes: [
      ["Snow depth", "45 cm of new snow since Monday."],
      ["Hot springs", "Ōyu bath open from 05:00."],
    ],
  },
  {
    id: "annupuri-ridge",
    title: "Annupuri summit ridge",
    area: "Niseko",
    date: "12 Feb",
    summary: "Clear skies and a crust on the south faces. Ski crampons help on the final rise.",
    notes: [
      ["Avalanche", "Considerable above 1,000 m on north aspects."],
      ["Parking", "Annupuri lot ploughed by 07:30."],
    ],
  },
  {
    id: "toya-rim",
    title: "Lake Tōya crater rim",
    area: "Lake Tōya",
    date: "11 Feb",
    summary: "Thin snow on the rim path, with ice under the leaves near the observatory steps.",
    notes: [
      ["Ice", "Microspikes needed on the north stairs."],
      ["Bus", "First bus from Tōya station at 08:10."],
    ],
  },
  {
    id: "nakasendo",
    title: "Nakasendō, Tsumago to Magome",
    area: "Kiso",
    date: "10 Feb",
    summary: "The old post road is clear except the shaded pass. The teahouse at the top opens at weekends.",
    notes: [
      ["Pass", "Packed snow for 600 m below Magome pass."],
      ["Luggage", "Forwarding service paused until March."],
    ],
  },
  {
    id: "hakkoda",
    title: "Hakkōda ropeway tour",
    area: "Aomori",
    date: "9 Feb",
    summary: "Snow monsters at their fullest. Visibility drops quickly once the afternoon cloud arrives.",
    notes: [
      ["Snow depth", "3.8 m at the ropeway summit."],
      ["Guides", "Guided tours only beyond the marked route."],
    ],
  },
  {
    id: "tenguyama",
    title: "Tenguyama from Otaru",
    area: "Otaru",
    date: "8 Feb",
    summary: "A short climb over packed snow with views across the harbour. Busy after 10:00.",
    notes: [
      ["Ropeway", "Running every 12 minutes."],
      ["Wind", "Cold northwest wind on the summit deck."],
    ],
  },
  {
    id: "utsukushigahara",
    title: "Utsukushigahara plateau",
    area: "Matsumoto",
    date: "7 Feb",
    summary: "The road is closed to cars at the hot spring. Walk the last 6 km on the ploughed lane.",
    notes: [
      ["Access road", "Closed above Utsukushigahara Onsen until April."],
      ["Hut status", "Ōgahara hut is shut for the season."],
    ],
  },
  {
    id: "jonen",
    title: "Jōnen approach trail",
    area: "Matsumoto",
    date: "5 Feb",
    summary: "Winter route for experienced parties only. The trailhead road is snowed in for 2 km.",
    notes: [
      ["Avalanche", "High in the gullies above Ninoshita."],
      ["Hut status", "Winter room open, no warden."],
    ],
  },
];

function fold(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function searchReports(query: string): SearchBarItem[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const every = (text: string) => terms.every((term) => fold(text).includes(term));
  const some = (text: string) => terms.some((term) => fold(text).includes(term));
  return reports.flatMap((report) => {
    const base = `${report.title} ${report.area}`;
    const notes = report.notes.filter(([name, text]) => some(`${name} ${text}`) && every(`${base} ${name} ${text}`));
    if (notes.length === 0 && !every(`${base} ${report.summary}`)) return [];
    return [
      {
        id: report.id,
        title: report.title,
        description: report.summary,
        meta: `${report.area} · ${report.date}`,
        icon: <FileText />,
      },
      ...notes.map(([name, text]) => ({
        id: `${report.id}/${name}`,
        title: name,
        description: text,
        icon: <Hash />,
        depth: 1 as const,
      })),
    ];
  });
}

function fetchReports(query: string) {
  const latency = 250 + Math.random() * 950;
  const fails = Math.random() < 0.125;
  return new Promise<SearchBarItem[]>((resolve, reject) => {
    setTimeout(
      () => (fails ? reject(new Error("The report service did not answer.")) : resolve(searchReports(query))),
      latency,
    );
  });
}

function useReportSearch() {
  const [results, setResults] = useState<SearchBarItem[] | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);
  const query = useRef("");

  function search(next: string) {
    query.current = next;
    const ticket = ++latest.current;
    if (!next.trim()) {
      setResults(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    fetchReports(next).then(
      (items) => {
        if (ticket !== latest.current) return;
        setResults(items);
        setFailed(false);
        setLoading(false);
      },
      () => {
        if (ticket !== latest.current) return;
        setFailed(true);
        setLoading(false);
      },
    );
  }

  return { results, isLoading, failed, search, retry: () => search(query.current) };
}

export default function SearchBarAsyncDemo() {
  const { results, isLoading, failed, search, retry } = useReportSearch();

  return (
    <div className="flex h-[400px] w-full max-w-lg flex-col">
      <SearchBar
        label="Trail reports"
        placeholder="Try “hakuba”, “avalanche” or “hut”…"
        onChange={search}
        results={results}
        isLoading={isLoading}
        error={failed}
        onRetry={retry}
      />
    </div>
  );
}

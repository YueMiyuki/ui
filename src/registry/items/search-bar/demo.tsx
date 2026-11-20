"use client";

import { Route, TrainFront } from "lucide-react";
import { SearchBar, type SearchBarItem } from "@/components/miyuki-ui/search-bar";

const stations: [string, string][] = [
  ["Otaru", "Hakodate Main Line"],
  ["Minami-Otaru", "Hakodate Main Line"],
  ["Zenibako", "Hakodate Main Line"],
  ["Yoichi", "Hakodate Main Line"],
  ["Niki", "Hakodate Main Line"],
  ["Kutchan", "Hakodate Main Line"],
  ["Niseko", "Hakodate Main Line"],
  ["Rankoshi", "Hakodate Main Line"],
  ["Oshamambe", "Hakodate Main Line"],
  ["Tōya", "Muroran Main Line"],
  ["Date-Mombetsu", "Muroran Main Line"],
  ["Noboribetsu", "Muroran Main Line"],
  ["Higashi-Muroran", "Muroran Main Line"],
  ["Shin-Chitose Airport", "Chitose Line"],
  ["Minami-Chitose", "Chitose Line"],
  ["Eniwa", "Chitose Line"],
  ["Matsumoto", "Ōito Line"],
  ["Shinano-Ōmachi", "Ōito Line"],
  ["Yanaba", "Ōito Line"],
  ["Kamishiro", "Ōito Line"],
  ["Hakuba", "Ōito Line"],
  ["Hakuba-Ōike", "Ōito Line"],
  ["Iiyama", "Iiyama Line"],
  ["Togari-Nozawa-Onsen", "Iiyama Line"],
  ["Morimiyanohara", "Iiyama Line"],
  ["Shiojiri", "Chūō Main Line"],
  ["Narai", "Chūō Main Line"],
  ["Yabuhara", "Chūō Main Line"],
  ["Kiso-Fukushima", "Chūō Main Line"],
  ["Agematsu", "Chūō Main Line"],
  ["Nagiso", "Chūō Main Line"],
  ["Aomori", "Ōu Main Line"],
  ["Hirosaki", "Ōu Main Line"],
  ["Fukaura", "Gonō Line"],
];

const lines: [string, string][] = [
  ["Hakodate Main Line", "Hokkaido"],
  ["Muroran Main Line", "Hokkaido"],
  ["Ōito Line", "Nagano"],
  ["Iiyama Line", "Nagano"],
  ["Chūō Main Line", "Nagano and Gifu"],
  ["Gonō Line", "Aomori and Akita"],
];

const places: SearchBarItem[] = [
  ...stations.map(([name, line]) => ({ id: name, title: name, meta: line, icon: <TrainFront /> })),
  ...lines.map(([name, region]) => ({ id: name, title: name, meta: region, icon: <Route /> })),
];

const recent = [
  {
    id: "recent",
    title: "Recent",
    items: ["Otaru", "Hakuba", "Kiso-Fukushima"].map((id) => places.find((p) => p.id === id)!),
  },
];

export default function SearchBarDemo() {
  return (
    <div className="flex h-[400px] w-full max-w-md flex-col">
      <SearchBar
        label="Stations and lines"
        placeholder="Otaru, Hakuba, Kiso…"
        results={places}
        filter="contains"
        suggestions={recent}
        shortcut="/"
      />
    </div>
  );
}

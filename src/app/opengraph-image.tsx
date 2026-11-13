import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "miyuki-ui: components with the stillness of snow and the motion of water";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const snow = "#f7fafd";
const ink = "#122230";
const water = "#0079b5";
const surface = "#4ab8e8";

const [semibold, icon] = await Promise.all([
  readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf")),
  readFile(join(process.cwd(), "src/app/icon.svg"), "utf8"),
]);
const markPaths = [...icon.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: snow,
        color: ink,
        fontFamily: "Geist",
        fontWeight: 600,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "64px 80px 0" }}>
        <svg
          viewBox="0 0 24 24"
          width={96}
          height={96}
          fill="none"
          stroke={water}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: -11 }}
        >
          {markPaths.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
        <div style={{ fontSize: 54, letterSpacing: -1.2, lineHeight: 1 }}>miyuki-ui</div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "flex-end",
          padding: "0 80px 56px",
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1.08, letterSpacing: -1.9, textWrap: "balance" }}>
          Components with the stillness of snow and the motion of water
        </div>
      </div>
      <div style={{ display: "flex", height: 3, background: surface }} />
      <div style={{ display: "flex", height: 10 }} />
      <div style={{ display: "flex", height: 108, background: water }} />
    </div>,
    { ...size, fonts: [{ name: "Geist", data: semibold, weight: 600, style: "normal" }] },
  );
}

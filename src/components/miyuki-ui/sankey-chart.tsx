"use client";

import { type SankeyNode, sankey } from "d3-sankey";
import { useMemo, useRef } from "react";
import {
  ChartCard,
  type ChartCardProps,
  ChartPlot,
  ChartTable,
  ChartTooltip,
  chartColor,
  formatNumber,
  formatPercent,
  RevealMask,
  staggerDelay,
  TubeFill,
  textWidth,
  useChartId,
  useChartSize,
  useInViewOnce,
  useNearestIndex,
} from "@/components/miyuki-ui/lib/chart";

export interface SankeyChartNode {
  id: string;
  name?: string;
  color?: string;
}

export interface SankeyChartLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyChartProps extends Omit<ChartCardProps, "children"> {
  nodes: SankeyChartNode[];
  links: SankeyChartLink[];
  format?: (value: number) => string;
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
  summary?: string;
}

interface PlacedNode {
  id: string;
  name: string;
  color: string;
  value: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  right: boolean;
  labelY: number;
  links: number[];
}

interface PlacedLink {
  source: number;
  target: number;
  value: number;
  width: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

type Item = { kind: "node"; index: number } | { kind: "link"; index: number };

const NEUTRAL = "color-mix(in oklab, var(--foreground) 68%, var(--card))";
const LINK_GAP = 2;
const LABEL_GAP = 8;
const LABEL_LINE = 32;
const NAME_SIZE = 13;
const SUB_SIZE = 11;
const plain = (v: number) => formatNumber(v);

function spread(ys: number[], gap: number, min: number, max: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < order.length; k++) order[k].y = Math.max(order[k].y, order[k - 1].y + gap);
  const last = order.length - 1;
  if (last >= 0 && order[last].y > max) {
    order[last].y = max;
    for (let k = last - 1; k >= 0; k--) order[k].y = Math.min(order[k].y, order[k + 1].y - gap);
  }
  if (last >= 0 && order[0].y < min) {
    order[0].y = min;
    for (let k = 1; k <= last; k++) order[k].y = Math.max(order[k].y, order[k - 1].y + gap);
  }
  const out = ys.slice();
  for (const o of order) out[o.i] = o.y;
  return out;
}

function hitLink(link: PlacedLink, px: number, py: number): number | null {
  const { x0, x1, y0, y1 } = link;
  if (px < x0 || px > x1 || x1 <= x0) return null;
  const xm = (x0 + x1) / 2;
  const xAt = (t: number) => {
    const u = 1 - t;
    return u * u * u * x0 + 3 * u * u * t * xm + 3 * u * t * t * xm + t * t * t * x1;
  };
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 24; k++) {
    const t = (lo + hi) / 2;
    if (xAt(t) < px) lo = t;
    else hi = t;
  }
  const t = (lo + hi) / 2;
  const y = y0 + (y1 - y0) * (3 * t * t - 2 * t * t * t);
  const dx = 3 * (xm - x0) * ((1 - t) * (1 - t) + t * t);
  const dy = (y1 - y0) * 6 * t * (1 - t);
  const slope = dx > 0 ? dy / dx : 0;
  const reach = (Math.max(link.width, 4) / 2) * Math.sqrt(1 + slope * slope);
  const distance = Math.abs(py - y);
  return distance <= reach ? distance : null;
}

export function SankeyChart({
  nodes,
  links,
  format = plain,
  height = 248,
  nodeWidth = 8,
  nodePadding = 18,
  summary,
  label,
  ...props
}: SankeyChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const { width } = useChartSize(plotRef);
  const inView = useInViewOnce(plotRef);
  const revealId = useChartId("sankey-reveal");

  const model = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id));
    const valid = links.filter((l) => ids.has(l.source) && ids.has(l.target) && l.value > 0);
    const hasOut = new Set(valid.map((l) => l.source));
    const hasIn = new Set(valid.map((l) => l.target));
    const names = nodes.map((n) => n.name ?? n.id);
    const position = new Map(nodes.map((n, i) => [n.id, i]));
    const outgoing = nodes.map(() => 0);
    const incoming = nodes.map(() => 0);
    for (const l of valid) {
      outgoing[position.get(l.source) ?? 0] += l.value;
      incoming[position.get(l.target) ?? 0] += l.value;
    }
    const values = nodes.map((_, i) => Math.max(outgoing[i], incoming[i]));
    const total = nodes.reduce((s, n, i) => s + (hasIn.has(n.id) ? 0 : values[i]), 0);
    const right = nodes.map((n) => hasIn.has(n.id) && !hasOut.has(n.id));
    let paletteIndex = 0;
    const colors = nodes.map((n) => n.color ?? (hasOut.has(n.id) ? chartColor(paletteIndex++) : NEUTRAL));
    const subs = values.map((v) => `${formatPercent(total > 0 ? v / total : 0, { digits: 0 })} · ${format(v)}`);
    const reach = names.map((name, i) =>
      Math.max(Math.ceil(textWidth(name, NAME_SIZE) * 1.04), textWidth(subs[i], SUB_SIZE)),
    );
    const marginLeft = reach.reduce((w, r, i) => (right[i] ? w : Math.max(w, r + LABEL_GAP)), 0);
    const marginRight = reach.reduce((w, r, i) => (right[i] ? Math.max(w, r + LABEL_GAP) : w), 0);
    return { valid, position, names, values, total, right, colors, subs, reach, marginLeft, marginRight };
  }, [nodes, links, format]);

  const { placed, flows } = useMemo(() => {
    const { valid, position, names, values, right, colors, marginLeft, marginRight } = model;
    if (width <= 0 || nodes.length === 0) return { placed: [] as PlacedNode[], flows: [] as PlacedLink[] };

    const graph = sankey<{ id: string }, { value: number }>()
      .nodeId((d) => d.id)
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .nodeSort(null)
      .iterations(0)
      .extent([
        [marginLeft, 0],
        [Math.max(marginLeft + nodeWidth * 2 + 24, width - marginRight), height],
      ])({
      nodes: nodes.map((n) => ({ id: n.id })),
      links: valid.map((l) => ({ source: l.source, target: l.target, value: l.value })),
    });

    const index = (end: string | number | SankeyNode<{ id: string }, { value: number }>) =>
      typeof end === "object" ? (end.index ?? 0) : typeof end === "number" ? end : (position.get(end) ?? 0);

    const flows: PlacedLink[] = graph.links.map((l) => {
      const s = graph.nodes[index(l.source)];
      const t = graph.nodes[index(l.target)];
      return {
        source: index(l.source),
        target: index(l.target),
        value: l.value,
        width: l.width ?? 0,
        x0: (s.x1 ?? 0) + LINK_GAP,
        x1: (t.x0 ?? 0) - LINK_GAP,
        y0: l.y0 ?? 0,
        y1: l.y1 ?? 0,
      };
    });

    const centers = graph.nodes.map((n) => ((n.y0 ?? 0) + (n.y1 ?? 0)) / 2);
    const labelY = centers.slice();
    for (const side of [false, true]) {
      const members = nodes.map((_, i) => i).filter((i) => right[i] === side);
      const ys = spread(
        members.map((i) => centers[i]),
        LABEL_LINE,
        LABEL_LINE / 2,
        height - LABEL_LINE / 2,
      );
      members.forEach((i, k) => (labelY[i] = ys[k]));
    }

    const placed: PlacedNode[] = graph.nodes.map((n, i) => ({
      id: n.id,
      name: names[i],
      color: colors[i],
      value: values[i],
      x0: n.x0 ?? 0,
      x1: n.x1 ?? 0,
      y0: n.y0 ?? 0,
      y1: n.y1 ?? 0,
      right: right[i],
      labelY: labelY[i],
      links: flows.map((f, k) => (f.source === i || f.target === i ? k : -1)).filter((k) => k >= 0),
    }));

    return { placed, flows };
  }, [model, nodes, width, height, nodeWidth, nodePadding]);

  const { total, subs, reach, names, values, valid, right } = model;

  const items: Item[] = useMemo(() => {
    const byY = (a: number, b: number) => placed[a].y0 - placed[b].y0;
    const nodeOrder = placed
      .map((_, i) => i)
      .sort((a, b) => Number(placed[a].right) - Number(placed[b].right) || byY(a, b));
    const linkOrder = flows
      .map((_, k) => k)
      .sort((a, b) => byY(flows[a].source, flows[b].source) || flows[a].y1 - flows[b].y1);
    return [
      ...nodeOrder.map((index) => ({ kind: "node" as const, index })),
      ...linkOrder.map((index) => ({ kind: "link" as const, index })),
    ];
  }, [placed, flows]);

  const { active, bind } = useNearestIndex({
    count: items.length,
    focusIndex: 0,
    locate: (px, py) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== "node") continue;
        const n = placed[item.index];
        const onBar = px >= n.x0 - 6 && px <= n.x1 + 6 && py >= n.y0 - 2 && py <= n.y1 + 2;
        const span = reach[item.index] + LABEL_GAP;
        const onLabel =
          Math.abs(py - n.labelY) <= LABEL_LINE / 2 &&
          (n.right ? px >= n.x1 && px <= n.x1 + span : px <= n.x0 && px >= n.x0 - span);
        if (onBar || onLabel) return i;
      }
      let best: number | null = null;
      let bestWidth = Infinity;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== "link") continue;
        const link = flows[item.index];
        if (hitLink(link, px, py) != null && link.width < bestWidth) {
          best = i;
          bestWidth = link.width;
        }
      }
      return best;
    },
  });

  const current = active != null ? items[active] : null;
  const litNodes = new Set<number>();
  const litLinks = new Set<number>();
  if (current?.kind === "node") {
    litNodes.add(current.index);
    for (const k of placed[current.index]?.links ?? []) {
      litLinks.add(k);
      litNodes.add(flows[k].source);
      litNodes.add(flows[k].target);
    }
  } else if (current?.kind === "link" && flows[current.index]) {
    litLinks.add(current.index);
    litNodes.add(flows[current.index].source);
    litNodes.add(flows[current.index].target);
  }
  const focusing = current != null;
  const linkOrder = flows
    .map((_, k) => k)
    .sort((a, b) => Number(litLinks.has(a)) - Number(litLinks.has(b)) || flows[b].width - flows[a].width);

  const described = (side: boolean) =>
    nodes
      .map((_, i) => i)
      .filter((i) => right[i] === side && values[i] > 0)
      .map((i) => `${names[i]} (${format(values[i])})`)
      .join(", ");
  const largest = valid.reduce<SankeyChartLink | null>((m, l) => (m == null || l.value > m.value ? l : m), null);
  const nameOf = (id: string) => names[model.position.get(id) ?? 0];
  const description =
    summary ??
    `${format(total)} flowing from ${described(false)} to ${described(true)}.` +
      (largest
        ? ` The largest flow is ${nameOf(largest.source)} to ${nameOf(largest.target)}, ${format(largest.value)}.`
        : "");

  const share = (part: number, whole: number) => formatPercent(whole > 0 ? part / whole : 0, { digits: 0 });

  const tooltip = (() => {
    if (!current) return null;
    if (current.kind === "node") {
      const n = placed[current.index];
      if (!n) return null;
      return (
        <ChartTooltip
          x={(n.x0 + n.x1) / 2}
          y={(n.y0 + n.y1) / 2}
          offset={nodeWidth / 2 + 8}
          title={n.name}
          items={[
            { label: "Total", value: format(n.value), color: n.color, marker: "square" },
            { label: "Share", value: share(n.value, total) },
          ]}
        />
      );
    }
    const f = flows[current.index];
    if (!f) return null;
    const s = placed[f.source];
    const t = placed[f.target];
    return (
      <ChartTooltip
        x={(f.x0 + f.x1) / 2}
        y={(f.y0 + f.y1) / 2}
        offset={Math.max(10, f.width / 2 + 6)}
        title={`${s.name} → ${t.name}`}
        items={[
          { label: "Flow", value: format(f.value), color: s.color, marker: "square" },
          { label: `Of ${s.name}`, value: share(f.value, s.value) },
          { label: `Of ${t.name}`, value: share(f.value, t.value) },
        ]}
      />
    );
  })();

  return (
    <ChartCard label={label} {...props}>
      <ChartPlot ref={plotRef} summary={description} height={height} {...bind}>
        {width > 0 && placed.length > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            <defs>
              <RevealMask id={revealId} width={width} height={height} play={inView} />
            </defs>
            <g mask={`url(#${revealId})`} fill="none">
              {linkOrder.map((k) => {
                const f = flows[k];
                const xm = (f.x0 + f.x1) / 2;
                return (
                  <path
                    key={k}
                    d={`M${f.x0},${f.y0}C${xm},${f.y0} ${xm},${f.y1} ${f.x1},${f.y1}`}
                    strokeWidth={Math.max(1, f.width)}
                    strokeOpacity={!focusing ? 0.35 : litLinks.has(k) ? 0.72 : 0.1}
                    className="mix-blend-multiply transition-[stroke-opacity] duration-200 ease-settle dark:mix-blend-screen"
                    style={{ stroke: placed[f.source].color }}
                  />
                );
              })}
            </g>
            {placed.map((n, i) => (
              <TubeFill
                key={n.id}
                x={n.x0}
                width={n.x1 - n.x0}
                bottom={n.y1}
                level={n.y0}
                radius={3}
                color={n.color}
                play={inView}
                delay={staggerDelay(i, placed.length)}
                style={{ opacity: !focusing || litNodes.has(i) ? 1 : 0.3 }}
              />
            ))}
            {placed.map((n, i) => {
              const x = n.right ? n.x1 + LABEL_GAP : n.x0 - LABEL_GAP;
              return (
                <g
                  key={n.id}
                  aria-hidden="true"
                  textAnchor={n.right ? "start" : "end"}
                  className="transition-opacity duration-200 ease-settle"
                  opacity={!focusing || litNodes.has(i) ? 1 : 0.4}
                >
                  <text
                    x={x}
                    y={n.labelY - 7}
                    dy="0.34em"
                    className="fill-foreground font-medium"
                    style={{ fontSize: NAME_SIZE }}
                  >
                    {n.name}
                  </text>
                  <text
                    x={x}
                    y={n.labelY + 9}
                    dy="0.34em"
                    className="fill-muted-foreground"
                    style={{ fontSize: SUB_SIZE, fontVariantNumeric: "tabular-nums" }}
                  >
                    {subs[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        {width > 0 && tooltip}
      </ChartPlot>
      <ChartTable
        caption={typeof label === "string" ? label : "Flows"}
        columns={["From", "To", "Value", "Share of source"]}
        rows={valid.map((l) => [
          nameOf(l.source),
          nameOf(l.target),
          format(l.value),
          share(l.value, values[model.position.get(l.source) ?? 0]),
        ])}
      />
    </ChartCard>
  );
}

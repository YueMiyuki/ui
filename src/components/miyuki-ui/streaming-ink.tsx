"use client";

import { useReducedMotion } from "motion/react";
import { type ComponentProps, Fragment, type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface StreamingInkProps extends Omit<ComponentProps<"div">, "children"> {
  text: string;
  done?: boolean;
  speed?: number;
}

interface Word {
  index: number;
  text: string;
}

type Piece = { type: "word"; word: Word } | { type: "space" } | { type: "break" };

interface Run {
  code: boolean;
  pieces: Piece[];
}

interface Stroke {
  el: HTMLElement;
  t0: number;
  t1: number;
}

const INK = "linear-gradient(90deg, #000 42%, transparent 58%)";
const DRY = 1300;

const clock = () => (typeof performance === "undefined" ? 0 : performance.now());

function visible(text: string, done: boolean) {
  if (done) return text;
  const match = /\s(?=\S*$)/.exec(text);
  if (match) return text.slice(0, match.index + 1);
  return /\s$/.test(text) ? text : "";
}

function parse(source: string): Run[][] {
  const paragraphs: Run[][] = [];
  let index = 0;
  let code = false;
  for (const block of source.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n+/)) {
    if (!block.trim()) continue;
    const runs: Run[] = [];
    let run: Run = { code, pieces: [] };
    const push = (piece: Piece) => {
      if (run.code !== code) {
        if (run.pieces.length) runs.push(run);
        run = { code, pieces: [] };
      }
      run.pieces.push(piece);
    };
    const tokens = block.trim().split(/(`|\n|[ \t]+)/);
    for (const token of tokens) {
      if (!token) continue;
      if (token === "`") {
        code = !code;
        continue;
      }
      if (token === "\n") push({ type: "break" });
      else if (/^[ \t]+$/.test(token)) push({ type: "space" });
      else push({ type: "word", word: { index: index++, text: token } });
    }
    if (run.pieces.length) runs.push(run);
    paragraphs.push(runs);
  }
  return paragraphs;
}

function plain(source: string) {
  return source
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((block) => block.replace(/`/g, "").trim())
    .filter(Boolean);
}

function Brush() {
  return (
    <svg viewBox="0 0 20 28" fill="none" aria-hidden="true" className="block h-full w-full overflow-visible">
      <path
        d="M15.6 2.9c.5-.4 1.3-.3 1.7.2.4.5.3 1.2-.2 1.6l-5.3 7.6-1.9-1.3 5.7-8.1Z"
        className="fill-foreground/55"
      />
      <path d="M9.7 10.6l2.2 1.5-1.2 1.8-2.3-1.6 1.3-1.7Z" className="fill-muted-foreground" />
      <path
        d="M8.3 12.4l2.4 1.6c.5 2.3-.4 5.8-2.6 8.7-1.6 2.1-3.4 3.3-5.1 3.6.4-1.7.6-3.9 1.3-6.2.8-3 2.2-5.9 4-7.7Z"
        className="fill-foreground"
      />
      <path
        d="M3 26.3c.3-1.3.6-2.7 1-4.1.7.6 1.5 1 2.4 1.1-1 1.4-2.2 2.4-3.4 3Z"
        className="fill-[color-mix(in_oklab,var(--brand)_70%,var(--foreground))]"
      />
    </svg>
  );
}

export function StreamingInk({ text, done = false, speed = 1, className, ...props }: StreamingInkProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const brushRef = useRef<HTMLSpanElement>(null);
  const inked = useRef(-1);
  const seen = useRef("");
  const pen = useRef(0);
  const strokes = useRef<Stroke[]>([]);
  const doneRef = useRef(done);
  const wake = useRef<() => void>(() => {});
  const reduce = useReducedMotion() === true;

  const shown = visible(text, done);
  const paragraphs = parse(shown);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const words = Array.from(layer.querySelectorAll<HTMLElement>("[data-ink]"));
    const restarted = !shown.startsWith(seen.current);
    seen.current = shown;
    if (inked.current < 0 || reduce) {
      inked.current = words.length;
      strokes.current = words.length ? [{ el: words[words.length - 1], t0: 0, t1: 0 }] : [];
      wake.current();
      return;
    }
    if (restarted) {
      inked.current = 0;
      strokes.current = [];
      pen.current = 0;
    }
    const now = clock();
    let at = Math.max(now, pen.current);
    const pace = Math.max(0.2, speed);
    for (const el of words) {
      const i = Number(el.dataset.ink);
      if (i < inked.current) continue;
      const chars = Number(el.dataset.len) || 1;
      const backlog = at - now;
      const hurry = backlog > 700 ? Math.max(0.3, 700 / backlog) : 1;
      const duration = (Math.min(460, 90 + chars * 24) * hurry) / pace;
      const delay = at - now;
      el.style.setProperty("mask-image", INK);
      el.style.setProperty("mask-size", "260% 100%");
      el.style.setProperty("mask-repeat", "no-repeat");
      el.style.setProperty("-webkit-mask-image", INK);
      el.style.setProperty("-webkit-mask-size", "260% 100%");
      el.style.setProperty("-webkit-mask-repeat", "no-repeat");
      const ink = el.animate(
        [
          { maskPosition: "100% 0", webkitMaskPosition: "100% 0" },
          { maskPosition: "0% 0", webkitMaskPosition: "0% 0" },
        ],
        { duration, delay, easing: "cubic-bezier(0.32, 0.08, 0.36, 1)", fill: "backwards" },
      );
      ink.finished
        .then(() => {
          for (const prop of [
            "mask-image",
            "mask-size",
            "mask-repeat",
            "-webkit-mask-image",
            "-webkit-mask-size",
            "-webkit-mask-repeat",
          ]) {
            el.style.removeProperty(prop);
          }
        })
        .catch(() => {});
      el.animate(
        [
          { color: "var(--miyuki-streaming-ink-wet)", offset: 0 },
          { color: "var(--miyuki-streaming-ink-wet)", offset: 0.28 },
        ],
        { duration: duration + DRY / pace, delay, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "backwards" },
      );
      el.querySelector<HTMLElement>("[data-wet]")?.animate(
        [
          { opacity: 0.95, backgroundPosition: "100% 0" },
          { opacity: 0.95, offset: 0.45 },
          { opacity: 0, backgroundPosition: "0% 0" },
        ],
        { duration: duration + (DRY * 0.7) / pace, delay, easing: "cubic-bezier(0.45, 0, 0.55, 1)", fill: "backwards" },
      );
      const chip = el.parentElement;
      if (chip?.tagName === "CODE" && !chip.dataset.inked) {
        chip.dataset.inked = "";
        chip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay, easing: "ease-out", fill: "backwards" });
      }
      strokes.current.push({ el, t0: at, t1: at + duration });
      at += (duration * 0.55 + 28 * hurry) / pace;
    }
    pen.current = at;
    inked.current = Math.max(inked.current, words.length);
    if (strokes.current.length > 24) strokes.current = strokes.current.slice(-24);
    wake.current();
  }, [shown, reduce, speed]);

  useEffect(() => {
    doneRef.current = done;
    wake.current();
  }, [done]);

  useEffect(() => {
    const brush = brushRef.current;
    const layer = layerRef.current;
    if (!brush || !layer) return;
    let raf = 0;
    let lift = -1;
    let x = 0;
    let y = 0;
    let placed = false;

    const anchor = (el: HTMLElement, p: number) => {
      const size = parseFloat(getComputedStyle(el).fontSize) || 16;
      return {
        x: el.offsetLeft + el.offsetWidth * p + size * 0.06 * p,
        y: el.offsetTop + el.offsetHeight / 2 + size * 0.36,
        size,
      };
    };

    const ease = (t: number) => 1 - (1 - t) ** 2.2;

    const tick = (now: number) => {
      raf = 0;
      const list = strokes.current;
      if (list.length === 0) {
        brush.style.opacity = "0";
        placed = false;
        lift = -1;
        return;
      }
      let current = list[0];
      let next: Stroke | null = null;
      for (let i = 0; i < list.length; i++) {
        if (list[i].t0 <= now) current = list[i];
        else {
          next = list[i];
          break;
        }
      }
      const finished = now >= list[list.length - 1].t1;
      let hover = 0;
      let tilt = 0;
      if (now < current.t0) {
        const a = anchor(current.el, 0);
        x = a.x;
        y = a.y;
        hover = 1;
      } else if (now <= current.t1 || reduce) {
        const p = reduce || current.t1 <= current.t0 ? 1 : (now - current.t0) / (current.t1 - current.t0);
        const a = anchor(current.el, ease(Math.min(1, p)));
        x = a.x;
        y = a.y;
        tilt = Math.sin(p * Math.PI) * 4;
      } else if (next) {
        const from = anchor(current.el, 1);
        const to = anchor(next.el, 0);
        const q = Math.min(1, (now - current.t1) / Math.max(1, next.t0 - current.t1));
        const s = q * q * (3 - 2 * q);
        x = from.x + (to.x - from.x) * s;
        y = from.y + (to.y - from.y) * s;
        hover = Math.sin(q * Math.PI) * (Math.abs(to.y - from.y) > 2 ? 3 : 0.6);
      } else {
        const a = anchor(current.el, 1);
        x = a.x;
        y = a.y;
        hover = 1;
      }
      const size = parseFloat(getComputedStyle(layer).fontSize) || 16;
      let offX = 0;
      let offY = 0;
      let opacity = 1;
      if (doneRef.current && finished) {
        if (lift < 0) lift = now;
        const t = Math.min(1, (now - lift) / (reduce ? 1 : 420));
        const e = 1 - (1 - t) ** 3;
        offX = e * size * 0.5;
        offY = -e * size * 0.9;
        opacity = 1 - t;
        tilt = -e * 10;
      } else {
        lift = -1;
        if (hover > 0 && !reduce) offY = -hover * (size * 0.12) - (1 + Math.sin(now / 420)) * size * 0.04;
      }
      brush.style.opacity = String(opacity);
      brush.style.transform = `translate3d(${(x + offX).toFixed(2)}px, ${(y + offY).toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
      if (!placed) placed = true;
      const settled = doneRef.current && finished && opacity <= 0;
      if (!settled) raf = requestAnimationFrame(tick);
    };

    wake.current = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    wake.current();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      wake.current = () => {};
    };
  }, [reduce]);

  const sentences = plain(text);

  const renderRun = (run: Run, key: number) => {
    const nodes: ReactNode[] = [];
    run.pieces.forEach((piece, i) => {
      const last = i === run.pieces.length - 1;
      if (piece.type === "space") nodes.push(" ");
      else if (piece.type === "break") {
        if (!last) nodes.push(<br key={`b${i}`} />);
      } else {
        nodes.push(
          <span
            key={piece.word.index}
            data-ink={piece.word.index}
            data-len={piece.word.text.length}
            className="relative inline-block"
          >
            {piece.word.text}
            <span
              data-wet=""
              className="pointer-events-none absolute inset-0 bg-[length:300%_100%] bg-clip-text text-transparent opacity-0 select-none"
              style={{
                backgroundImage:
                  "linear-gradient(100deg, transparent 0%, transparent 38%, var(--miyuki-streaming-ink-sheen) 50%, transparent 62%, transparent 100%)",
              }}
            >
              {piece.word.text}
            </span>
          </span>,
        );
      }
    });
    if (!run.code) return <Fragment key={key}>{nodes}</Fragment>;
    return (
      <code
        key={key}
        className="rounded-[5px] bg-muted px-[0.32em] py-[0.12em] font-mono text-[0.87em] text-foreground ring-1 ring-border ring-inset [box-decoration-break:clone]"
      >
        {nodes}
      </code>
    );
  };

  return (
    <div
      {...props}
      aria-busy={!done}
      className={cn(
        "relative text-[15px] leading-7 text-foreground [text-wrap:wrap]",
        "[--miyuki-streaming-ink-wet:color-mix(in_oklab,var(--foreground)_66%,var(--brand))] [--miyuki-streaming-ink-sheen:color-mix(in_oklab,var(--brand)_30%,white)]",
        "dark:[--miyuki-streaming-ink-wet:color-mix(in_oklab,var(--foreground)_60%,var(--brand))] dark:[--miyuki-streaming-ink-sheen:white]",
        className,
      )}
    >
      <div ref={layerRef} aria-hidden="true" className="relative">
        {paragraphs.map((runs, p) => (
          <p key={p} className="[&+p]:mt-[0.85em]">
            {runs.map(renderRun)}
          </p>
        ))}
        <span
          ref={brushRef}
          className="pointer-events-none absolute top-0 left-0 z-10 h-[1.45em] w-[1.05em] opacity-0 will-change-transform"
          style={{ translate: "-15% -93%", transformOrigin: "15% 93%" }}
        >
          <Brush />
        </span>
      </div>
      <div className="sr-only select-none">
        {sentences.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </div>
    </div>
  );
}

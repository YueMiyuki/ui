"use client";

import { CircleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { FieldError, Form, Input, Label, TextField } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { cn } from "@/lib/utils";

export interface NewsletterPostcardProps extends Omit<ComponentProps<"div">, "onSubmit" | "title"> {
  title: ReactNode;
  children?: ReactNode;
  signature?: ReactNode;
  onSubmit?: (email: string) => void | Promise<void>;
  submitLabel?: string;
  emailLabel?: string;
  stamp?: string;
  stampAlt?: string;
  stampValue?: string;
  postmark?: string;
  imprint?: string;
  confirmation?: ReactNode | ((email: string) => ReactNode);
}

type Phase = "idle" | "sending" | "stamping" | "posting" | "posted";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SETTLE = { type: "spring", stiffness: 420, damping: 34 } as const;
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.4 0 0 0 0 0.55 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";
const PERFORATION: CSSProperties = {
  maskImage: "linear-gradient(#000, #000), radial-gradient(circle, transparent 2.4px, #000 2.9px)",
  WebkitMaskImage: "linear-gradient(#000, #000), radial-gradient(circle, transparent 2.4px, #000 2.9px)",
  maskSize: "calc(100% - 8px) calc(100% - 8px), 8px 8px",
  WebkitMaskSize: "calc(100% - 8px) calc(100% - 8px), 8px 8px",
  maskPosition: "center, -4px -4px",
  WebkitMaskPosition: "center, -4px -4px",
  maskRepeat: "no-repeat, round",
  WebkitMaskRepeat: "no-repeat, round",
  maskComposite: "add",
  WebkitMaskComposite: "source-over",
};

const STAMP_EDGE =
  "drop-shadow(0 0 0.6px color-mix(in oklab, var(--foreground) 38%, transparent)) drop-shadow(0 1px 1.5px oklch(0.35 0.05 250 / 0.2))";

function wave(y: number, x0: number, x1: number, amp: number, phase: number) {
  const steps = 48;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const v = y + amp * Math.sin((x / 15) * Math.PI + phase);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${v.toFixed(1)}`;
  }
  return d;
}

const WAVES = [0, 1, 2, 3, 4].map((k) => wave(16 + k * 7, 60, 118, 2.1, k * 0.4));

function Postmark({
  place,
  date,
  play,
  reduced,
  instant,
}: {
  place: string;
  date: [string, string];
  play: boolean;
  reduced: boolean;
  instant?: boolean;
}) {
  const id = useId().replace(/[^\w-]/g, "");
  const draw = (delay: number, duration: number) =>
    reduced || instant
      ? {
          initial: false as const,
          animate: { opacity: play ? 1 : 0 },
          transition: { duration: 0.15 },
        }
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: play ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
          transition: play
            ? {
                pathLength: {
                  duration,
                  delay,
                  ease: [0.45, 0.05, 0.25, 1] as const,
                },
                opacity: { duration: 0.05, delay },
              }
            : { duration: 0.12 },
        };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 64"
      className="pointer-events-none absolute top-0 right-0 h-[5.5rem] w-auto overflow-visible text-[color-mix(in_oklab,var(--foreground)_82%,var(--brand))] mix-blend-multiply dark:text-foreground/85 dark:mix-blend-normal"
    >
      <defs>
        <path id={`${id}-top`} d="M 13 34 A 21 21 0 0 1 55 34" />
        <path id={`${id}-bottom`} d="M 12 34 A 22 22 0 0 0 56 34" />
      </defs>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <motion.circle cx={34} cy={34} r={28} strokeWidth={1.6} transform="rotate(-100 34 34)" {...draw(0, 0.42)} />
        <motion.circle cx={34} cy={34} r={16.5} strokeWidth={1.1} transform="rotate(-70 34 34)" {...draw(0.12, 0.34)} />
        {WAVES.map((d, k) => (
          <motion.path key={k} d={d} strokeWidth={1.5} {...draw(0.34 + k * 0.05, 0.42)} />
        ))}
      </g>
      <motion.g
        fill="currentColor"
        initial={false}
        animate={{ opacity: play ? 1 : 0 }}
        transition={{
          duration: reduced || instant ? 0.15 : 0.3,
          delay: play && !reduced && !instant ? 0.3 : 0,
        }}
      >
        <text className="text-[7.5px] font-semibold tracking-[0.08em]">
          <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
            {place}
          </textPath>
        </text>
        <text x={34} y={33} textAnchor="middle" className="text-[8.5px] font-semibold tabular-nums">
          {date[0]}
        </text>
        <text x={34} y={42} textAnchor="middle" className="text-[6.5px] tabular-nums">
          {date[1]}
        </text>
      </motion.g>
    </svg>
  );
}

function StampArt() {
  return (
    <svg viewBox="0 0 60 72" className="size-full" aria-hidden="true">
      <rect width="60" height="72" fill="var(--brand-soft)" />
      <circle cx="42" cy="20" r="6" fill="color-mix(in oklab, var(--warning) 70%, var(--card))" />
      <path
        d="M0 46 L14 28 L22 36 L33 20 L46 38 L52 32 L60 40 L60 52 L0 52Z"
        fill="color-mix(in oklab, var(--brand) 55%, var(--card))"
      />
      <path d="M33 20 L28 27 L31 26 L33 29 L36 25 L38 27Z M14 28 L11 32 L14 31 L16 33Z" fill="var(--card)" />
      <path d="M0 52 L60 52 L60 72 L0 72Z" fill="color-mix(in oklab, var(--brand) 80%, var(--foreground))" />
      <path
        d="M6 58 H22 M30 62 H50 M12 66 H26"
        stroke="var(--brand-soft)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

function Franking({
  stamp,
  stampAlt,
  stampValue,
  place,
  date,
  play,
  reduced,
  instant,
  className,
}: {
  stamp?: string;
  stampAlt: string;
  stampValue: string;
  place: string;
  date: [string, string];
  play: boolean;
  reduced: boolean;
  instant?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative h-[7.5rem] w-[10.5rem]", className)}>
      <div className="absolute top-3 right-1 h-[6.5rem] w-[5.25rem] -rotate-2" style={{ filter: STAMP_EDGE }}>
        <div className="absolute inset-0" style={PERFORATION}>
          <div className="absolute inset-0 bg-card" />
          <div className="absolute inset-[6px] overflow-clip bg-muted">
            {stamp ? (
              <img src={stamp} alt={stampAlt} draggable={false} className="size-full object-cover" />
            ) : (
              <StampArt />
            )}
          </div>
          <span className="absolute right-[9px] bottom-[8px] text-[11px] leading-none font-semibold text-background tabular-nums [text-shadow:0_0_2px_oklch(0.2_0.04_250/0.6)] dark:text-foreground">
            {stampValue}
          </span>
        </div>
      </div>
      <Postmark place={place} date={date} play={play} reduced={reduced} instant={instant} />
    </div>
  );
}

function dividerGap(text: string): CSSProperties {
  const half = `${Math.round(Array.from(text).length * 2.75 + 10)}px`;
  const mask = `linear-gradient(to bottom, #000 calc(50% - ${half}), transparent calc(50% - ${half}), transparent calc(50% + ${half}), #000 calc(50% + ${half}))`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

function today(): [string, string] {
  const now = new Date();
  return [now.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), String(now.getFullYear())];
}

export function NewsletterPostcard({
  title,
  children,
  signature,
  onSubmit,
  submitLabel = "Subscribe",
  emailLabel = "Your email address",
  stamp,
  stampAlt = "",
  stampValue = "84",
  postmark = "Hakuba",
  imprint,
  confirmation,
  className,
  ...props
}: NewsletterPostcardProps) {
  const reduced = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>("idle");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [date, setDate] = useState<[string, string]>(["", ""]);
  const [announce, setAnnounce] = useState("");
  const done = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (phase === "stamping") {
      const id = window.setTimeout(() => setPhase("posting"), reduced ? 500 : 1150);
      return () => window.clearTimeout(id);
    }
    if (phase === "posting") {
      const id = window.setTimeout(() => setPhase("posted"), 1200);
      return () => window.clearTimeout(id);
    }
    if (phase === "posted") done.current?.focus();
  }, [phase, reduced]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase !== "idle") return;
    const value = email.trim();
    setFailure(null);
    setPhase("sending");
    try {
      await onSubmit?.(value);
    } catch {
      setFailure("The card did not go through. Check your connection and try again.");
      setPhase("idle");
      return;
    }
    setSent(value);
    setDate(today());
    setAnnounce(`Subscribed. The first letter will go to ${value}.`);
    setPhase("stamping");
  };

  const reset = () => {
    setEmail("");
    setSent("");
    setAnnounce("");
    setPhase("idle");
  };

  const marked = phase === "stamping" || phase === "posting" || phase === "posted";
  const away = phase === "posting" || phase === "posted";

  return (
    <div {...props} className={cn("@container grid w-full max-w-2xl p-4 *:[grid-area:1/1]", className)}>
      <motion.div
        className="relative"
        inert={away}
        onAnimationComplete={() => setPhase((p) => (p === "posting" ? "posted" : p))}
        initial={false}
        animate={
          away
            ? reduced
              ? { opacity: 0 }
              : { x: "26%", y: -22, rotate: 4, opacity: 0 }
            : { x: 0, y: 0, rotate: 0, opacity: 1 }
        }
        transition={
          away
            ? reduced
              ? { duration: 0.18 }
              : {
                  duration: 0.56,
                  ease: [0.5, 0, 0.75, 0.2],
                  opacity: { duration: 0.56, ease: [0.4, 0, 0.9, 0.6] },
                }
            : SETTLE
        }
      >
        <section
          aria-labelledby={titleId}
          className="relative grid overflow-clip rounded-lg border border-border bg-card text-card-foreground shadow-md @xl:min-h-[22rem] @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply dark:opacity-[0.08] dark:mix-blend-screen"
            style={{ backgroundImage: GRAIN }}
          />
          <Franking
            stamp={stamp}
            stampAlt={stampAlt}
            stampValue={stampValue}
            place={postmark}
            date={date}
            play={marked}
            reduced={reduced}
            className="absolute top-2 right-4 @xl:top-3 @xl:right-5"
          />
          <div className="relative flex flex-col p-6 @xl:p-7">
            <h2
              id={titleId}
              className="min-h-24 pr-28 font-display text-2xl leading-[1.12] font-semibold tracking-[-0.025em] text-balance @xl:min-h-0 @xl:pr-0"
            >
              {title}
            </h2>
            {children ? (
              <div className="mt-4 text-[15px]/7 text-pretty text-muted-foreground [&_p+p]:mt-3">{children}</div>
            ) : null}
            {signature ? <div className="mt-auto pt-5 text-sm text-foreground/80">{signature}</div> : null}
          </div>

          <div aria-hidden="true" className="relative mx-6 h-px bg-border-strong @xl:mx-0 @xl:my-7 @xl:hidden" />
          <span
            aria-hidden="true"
            className="absolute inset-y-7 left-1/2 hidden w-px bg-border-strong @xl:block"
            style={imprint ? dividerGap(imprint) : undefined}
          />
          {imprint ? (
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 hidden origin-center -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[10px] whitespace-nowrap text-muted-foreground @xl:block"
            >
              {imprint}
            </span>
          ) : null}

          <div className="relative flex flex-col justify-end p-6 pt-5 @xl:p-7 @xl:pt-36 @xl:pl-8">
            <Form onSubmit={submit} validationBehavior="native" className="flex flex-col">
              <TextField
                name="email"
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setFailure(null);
                }}
                isRequired
                isDisabled={phase !== "idle"}
                isInvalid={failure != null ? true : undefined}
                validate={(v) =>
                  v.trim() === ""
                    ? "Write your email address on the card."
                    : EMAIL.test(v.trim())
                      ? null
                      : "That address looks incomplete. Use one like name@example.com."
                }
                autoComplete="email"
                className="group/field flex flex-col"
              >
                <Label className="text-[13px] font-medium text-muted-foreground">{emailLabel}</Label>
                <Input
                  placeholder="name@example.com"
                  className={cn(
                    "h-10 w-full rounded-t-sm rounded-b-none border-0 bg-transparent px-0.5 text-base text-foreground outline-none",
                    "shadow-[inset_0_-1px_0_var(--border-strong)] placeholder:text-muted-foreground/70",
                    "transition-[box-shadow,background-color] duration-150 ease-settle",
                    "data-[hovered]:shadow-[inset_0_-1px_0_var(--muted-foreground)]",
                    "data-[focused]:bg-brand/[0.05] data-[focused]:shadow-[inset_0_-2px_0_var(--brand)] data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                    "data-[invalid]:shadow-[inset_0_-2px_0_var(--destructive)] data-[invalid]:data-[focused]:bg-destructive/[0.05] data-[invalid]:data-[focus-visible]:ring-destructive/25",
                    "data-[disabled]:opacity-70",
                  )}
                />
                <FieldError className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-5 text-destructive">
                  {(validation) =>
                    (failure ?? validation.validationErrors.join(" ")) ? (
                      <>
                        <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
                        <span>{failure ?? validation.validationErrors.join(" ")}</span>
                      </>
                    ) : null
                  }
                </FieldError>
              </TextField>
              <span aria-hidden="true" className="mt-10 block h-px bg-border-strong" />
              <span aria-hidden="true" className="mt-10 block h-px bg-border-strong" />
              <div className="mt-6 flex justify-end">
                <Button type="submit" isPending={phase === "sending"}>
                  {submitLabel}
                </Button>
              </div>
            </Form>
          </div>
        </section>
      </motion.div>

      <motion.div
        aria-hidden={phase !== "posted"}
        inert={phase !== "posted"}
        className="flex items-center justify-center rounded-xl bg-muted p-8 text-center"
        initial={false}
        animate={phase === "posted" ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 8 }}
        transition={
          phase === "posted" ? (reduced ? { duration: 0.2 } : { ...SETTLE, delay: 0.05 }) : { duration: 0.12 }
        }
      >
        <div className="flex max-w-sm flex-col items-center">
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={
              phase === "posted" ? { opacity: 1, y: 0, rotate: -3 } : { opacity: 0, y: reduced ? 0 : 10, rotate: 0 }
            }
            transition={
              phase === "posted"
                ? reduced
                  ? { duration: 0.2 }
                  : { type: "spring", stiffness: 260, damping: 22, delay: 0.08 }
                : { duration: 0.12 }
            }
          >
            <Franking
              stamp={stamp}
              stampAlt=""
              stampValue={stampValue}
              place={postmark}
              date={date}
              play={phase === "posted"}
              reduced={reduced}
              instant
              className="-mr-6"
            />
          </motion.div>
          <h3
            ref={done}
            tabIndex={-1}
            className="mt-3 font-display text-xl font-semibold tracking-[-0.02em] outline-none"
          >
            Your card is in the post
          </h3>
          <div className="mt-2 text-sm/6 text-pretty text-muted-foreground">
            {typeof confirmation === "function"
              ? confirmation(sent)
              : (confirmation ?? (
                  <>
                    The first letter goes to <span className="font-medium break-all text-foreground">{sent}</span>.
                  </>
                ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-5" onPress={reset}>
            Use another address
          </Button>
        </div>
      </motion.div>

      <p role="status" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

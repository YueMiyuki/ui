"use client";

import { AnimatePresence, animate, motion, type Transition, useReducedMotion, type Variants } from "motion/react";
import {
  type ComponentProps,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button as AriaButton } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { CheckboxCard, CheckboxGroup } from "@/components/miyuki-ui/checkbox";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { TextField } from "@/components/miyuki-ui/input";
import { RadioCard, RadioGroup } from "@/components/miyuki-ui/radio";
import { cn } from "@/lib/utils";

export interface AgentQuestionsOption {
  id: string;
  label: ReactNode;
  description?: ReactNode;
}

export interface AgentQuestionsQuestion {
  id: string;
  title: ReactNode;
  help?: ReactNode;
  type: "single" | "multiple";
  options: AgentQuestionsOption[];
  allowOther?: boolean;
}

export interface AgentQuestionsAnswer {
  selected: string[];
  other?: string;
}

export type AgentQuestionsAnswers = Record<string, AgentQuestionsAnswer>;

export interface AgentQuestionsProps extends Omit<ComponentProps<"section">, "children"> {
  questions: AgentQuestionsQuestion[];
  onComplete?: (answers: AgentQuestionsAnswers) => void;
  onClose?: () => void;
  defaultAnswers?: AgentQuestionsAnswers;
  otherLabel?: ReactNode;
  otherPlaceholder?: string;
}

const OTHER = "__other";
const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const LEAVE: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] };
const SHIFT = 40;

interface Draft {
  selected: string[];
  other: string;
}

function toDrafts(questions: AgentQuestionsQuestion[], answers?: AgentQuestionsAnswers) {
  const out: Record<string, Draft> = {};
  for (const q of questions) {
    const a = answers?.[q.id];
    const selected = a?.selected ?? [];
    out[q.id] = {
      selected: a?.other != null && !selected.includes(OTHER) ? [...selected, OTHER] : selected,
      other: a?.other ?? "",
    };
  }
  return out;
}

function isAnswered(draft: Draft | undefined) {
  if (!draft) return false;
  const picked = draft.selected.filter((id) => id !== OTHER);
  return picked.length > 0 || (draft.selected.includes(OTHER) && draft.other.trim() !== "");
}

function finalise(questions: AgentQuestionsQuestion[], drafts: Record<string, Draft>): AgentQuestionsAnswers {
  const out: AgentQuestionsAnswers = {};
  for (const q of questions) {
    const d = drafts[q.id];
    if (!d) continue;
    const other = d.selected.includes(OTHER) && d.other.trim() !== "" ? d.other.trim() : undefined;
    out[q.id] = { selected: d.selected.filter((id) => id !== OTHER), ...(other ? { other } : null) };
  }
  return out;
}

const cardRow = "rounded-xl px-4 py-3 shadow-none";

function OtherRow({
  kind,
  selected,
  text,
  label,
  placeholder,
  modality,
  onText,
  onSubmit,
}: {
  kind: "single" | "multiple";
  selected: boolean;
  text: string;
  label: ReactNode;
  placeholder: string;
  modality: RefObject<"pointer" | "keyboard">;
  onText: (value: string) => void;
  onSubmit: () => void;
}) {
  const reduce = useReducedMotion();
  const field = useRef<HTMLDivElement>(null);
  const Card = kind === "single" ? RadioCard : CheckboxCard;
  const flat = cn(cardRow, "border-0 bg-transparent has-[[data-focus-visible]]:ring-0");

  useEffect(() => {
    if (!selected || modality.current !== "pointer") return;
    const frame = requestAnimationFrame(() => field.current?.querySelector("input")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [selected, modality]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-xs transition-[border-color,background-color,box-shadow] duration-150 ease-settle",
        selected ? "border-brand bg-brand-soft/50" : "border-border has-[label[data-hovered]]:border-border-strong",
        "has-[label[data-focus-visible]]:ring-[3px] has-[label[data-focus-visible]]:ring-ring",
      )}
    >
      <Card value={OTHER} className={flat}>
        {label}
      </Card>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            key="field"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: LEAVE }}
            transition={reduce ? { duration: 0.12 } : SETTLE}
            className="overflow-clip"
          >
            <div className="px-4 pt-0.5 pb-3.5">
              <TextField
                ref={field}
                aria-label="Your answer"
                placeholder={placeholder}
                value={text}
                onChange={onText}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSubmit();
                  }
                }}
                fieldClassName="bg-card"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepCheck({ on }: { on: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className="flex shrink-0 justify-start overflow-hidden"
      initial={false}
      animate={{ width: on ? 14 : 0 }}
      transition={reduce ? { duration: 0 } : SETTLE}
    >
      <svg viewBox="0 0 14 14" fill="none" className="size-3.5 shrink-0">
        <motion.path
          d="M3 7.4 5.8 10.1 11 4.3"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={
            on
              ? {
                  pathLength: 1,
                  opacity: 1,
                  transition: reduce
                    ? { duration: 0 }
                    : { pathLength: { duration: 0.16, delay: 0.08 }, opacity: { duration: 0.01, delay: 0.08 } },
                }
              : { pathLength: 0, opacity: 0, transition: { duration: 0.1 } }
          }
        />
      </svg>
    </motion.span>
  );
}

export function AgentQuestions({
  questions,
  onComplete,
  onClose,
  defaultAnswers,
  otherLabel = "Other",
  otherPlaceholder = "Tell me in your own words",
  className,
  ...props
}: AgentQuestionsProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [drafts, setDrafts] = useState(() => toDrafts(questions, defaultAnswers));
  const [reached, setReached] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const fromHeight = useRef<number | null>(null);
  const moved = useRef(false);
  const modality = useRef<"pointer" | "keyboard">("keyboard");

  useEffect(() => {
    const pointer = () => {
      modality.current = "pointer";
    };
    const keyboard = () => {
      modality.current = "keyboard";
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
    };
  }, []);

  const total = questions.length;
  const index = Math.min(step, total - 1);
  const question = questions[index];
  const draft = question ? drafts[question.id] : undefined;
  const answered = isAnswered(draft);
  const last = index === total - 1;

  useLayoutEffect(() => {
    const el = stage.current;
    const from = fromHeight.current;
    if (!el || from == null) return;
    fromHeight.current = null;
    el.style.height = "auto";
    const to = el.offsetHeight;
    if (reduce || Math.abs(to - from) < 1) return;
    el.style.height = `${from}px`;
    const controls = animate(el, { height: [from, to] }, SETTLE);
    controls.then(() => {
      el.style.height = "auto";
    });
    return () => controls.stop();
  }, [index, reduce]);

  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: true });
  }, [index]);

  if (!question || !draft) return null;

  const goTo = (next: number) => {
    if (next === index || next < 0 || next >= total) return;
    if (stage.current) fromHeight.current = stage.current.offsetHeight;
    moved.current = true;
    setDirection(next > index ? 1 : -1);
    setStep(next);
    setReached((r) => Math.max(r, next));
  };

  const update = (change: Partial<Draft>) =>
    setDrafts((all) => ({ ...all, [question.id]: { ...all[question.id], ...change } }));

  const advance = () => {
    if (!answered) return;
    if (last) onComplete?.(finalise(questions, drafts));
    else goTo(index + 1);
  };

  const titleId = `${uid}-title`;
  const helpId = `${uid}-help`;
  const otherOn = draft.selected.includes(OTHER);

  const slide: Variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * SHIFT }),
    center: {
      opacity: 1,
      x: 0,
      transition: reduce
        ? { duration: 0.12 }
        : { x: { ...SETTLE, delay: 0.06 }, opacity: { duration: 0.2, ease: "easeOut", delay: 0.08 } },
    },
    exit: (d: number) =>
      reduce
        ? { opacity: 0, transition: { duration: 0.1 } }
        : { opacity: 0, x: d * -SHIFT * 0.6, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } },
  };

  const options =
    question.type === "single" ? (
      <RadioGroup
        aria-labelledby={titleId}
        aria-describedby={question.help != null ? helpId : undefined}
        value={draft.selected[0] ?? null}
        onChange={(v) => update({ selected: [v] })}
        className="[&>div]:gap-2"
      >
        {question.options.map((o) => (
          <RadioCard key={o.id} value={o.id} description={o.description} className={cardRow}>
            {o.label}
          </RadioCard>
        ))}
        {question.allowOther && (
          <OtherRow
            kind="single"
            selected={otherOn}
            text={draft.other}
            label={otherLabel}
            placeholder={otherPlaceholder}
            modality={modality}
            onText={(other) => update({ other })}
            onSubmit={advance}
          />
        )}
      </RadioGroup>
    ) : (
      <CheckboxGroup
        aria-labelledby={titleId}
        aria-describedby={question.help != null ? helpId : undefined}
        value={draft.selected}
        onChange={(selected) => update({ selected })}
        className="[&>div]:gap-2"
      >
        {question.options.map((o) => (
          <CheckboxCard key={o.id} value={o.id} description={o.description} className={cardRow}>
            {o.label}
          </CheckboxCard>
        ))}
        {question.allowOther && (
          <OtherRow
            kind="multiple"
            selected={otherOn}
            text={draft.other}
            label={otherLabel}
            placeholder={otherPlaceholder}
            modality={modality}
            onText={(other) => update({ other })}
            onSubmit={advance}
          />
        )}
      </CheckboxGroup>
    );

  return (
    <section
      aria-labelledby={titleId}
      {...props}
      className={cn("@container relative w-full rounded-2xl border border-border bg-card shadow-sm", className)}
    >
      {onClose && (
        <CloseButton aria-label="Close questions" onPress={onClose} size="lg" className="absolute end-3 top-3 z-10" />
      )}
      <div ref={stage} className="relative overflow-clip">
        <AnimatePresence initial={false} mode="popLayout" custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            className="px-5 pt-5 pb-5"
          >
            <h3
              ref={heading}
              id={titleId}
              tabIndex={-1}
              className={cn(
                "text-lg leading-7 font-semibold tracking-tight text-foreground outline-none",
                onClose && "pe-9",
              )}
            >
              {question.title}
            </h3>
            {question.help != null && (
              <p id={helpId} className="mt-1 text-sm leading-5 text-muted-foreground">
                {question.help}
              </p>
            )}
            <div className="mt-4">{options}</div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border px-5 py-3.5">
        <ol aria-label="Steps" className="flex flex-1 items-center gap-1.5">
          {questions.map((q, i) => {
            const current = i === index;
            const done = !current && isAnswered(drafts[q.id]) && i <= reached;
            const reachable = i <= reached;
            return (
              <li key={q.id}>
                <AriaButton
                  isDisabled={!reachable || current}
                  onPress={() => goTo(i)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Step ${i + 1} of ${total}${done ? ", answered" : ""}`}
                  className={cn(
                    "relative isolate inline-flex h-6 cursor-default items-center gap-0.5 rounded-full px-2 text-xs leading-4 font-medium outline-none select-none",
                    "transition-[color,background-color,box-shadow] duration-200 ease-settle",
                    "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
                    current
                      ? "text-primary-foreground"
                      : done
                        ? "bg-brand-soft text-brand-strong data-[hovered]:bg-brand-soft/70"
                        : reachable
                          ? "text-muted-foreground ring-1 ring-border ring-inset data-[hovered]:bg-accent"
                          : "text-muted-foreground ring-1 ring-border ring-inset",
                  )}
                >
                  {current && (
                    <motion.span
                      layoutId={`${uid}-pill`}
                      transition={reduce ? { duration: 0 } : SETTLE}
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-xs"
                    />
                  )}
                  <StepCheck on={done} />
                  <span aria-hidden="true">
                    <span className="hidden @[31rem]:inline">Step </span>
                    {i + 1}
                  </span>
                </AriaButton>
              </li>
            );
          })}
        </ol>
        <div className="ms-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" isDisabled={index === 0} onPress={() => goTo(index - 1)}>
            Previous
          </Button>
          <Button variant="primary" size="sm" isDisabled={!answered} onPress={advance} className="min-w-16">
            {last ? "Start" : "Next"}
          </Button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {`Step ${index + 1} of ${total}`}
      </p>
    </section>
  );
}

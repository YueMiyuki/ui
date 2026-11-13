"use client";

import { ChevronRight, Compass, KeyRound, MessageSquare, PanelLeft, SquarePen } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Badge } from "@/components/miyuki-ui/badge";
import { Breadcrumb, Breadcrumbs } from "@/components/miyuki-ui/breadcrumb";
import { Button } from "@/components/miyuki-ui/button";
import { Drawer } from "@/components/miyuki-ui/drawer";
import {
  FloatingSidebar,
  type FloatingSidebarGroup,
  type FloatingSidebarItem,
  type FloatingSidebarUser,
} from "@/components/miyuki-ui/floating-sidebar";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { TextField } from "@/components/miyuki-ui/input";
import { PromptBox, type PromptBoxStatus } from "@/components/miyuki-ui/prompt-box";
import { ThinkingGlyph } from "@/components/miyuki-ui/thinking-glyph";
import { cn } from "@/lib/utils";

function useMedia(query: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const teams = [{ id: "kitakaze", name: "Kitakaze Guide", plan: "Starter, 1 seat", logo: <Compass /> }];

const defaultUser: FloatingSidebarUser = { name: "Aiko Tanaka", email: "aiko@kitakaze.example" };

const models = [
  { id: "standard", name: "Standard", description: "Quick answers for everyday plans." },
  { id: "fine", name: "Fine mesh", description: "Slower. Reads every bulletin in full." },
];

const samples = [
  {
    prompt: "Plan a snowy morning in Otaru",
    reply:
      "Take the 08:14 rapid from Sapporo; it reaches Otaru at 08:47, early enough to walk the canal before the shops open. Snow is forecast from midday, 6 to 9 cm, so ride the 10:05 bus up Tenguyama first and keep spikes for the steps on the way down.",
  },
  {
    prompt: "How deep is the snow at Nozawa today?",
    reply:
      "212 cm at the top station and 96 cm in the village at 06:00, with 14 cm overnight. Wind is light on the upper slopes. The Ōyu bath opens at 06:00 and is quietest before the first lift at 08:30.",
  },
  {
    prompt: "Two nights in Hakuba at the end of February",
    reply:
      "Book the hut by 18 February; it fills for the last weekend. The forecast for the 26th is clear with −9 °C on the ridge and 28 km/h wind. The last bus from Hakuba station to Happō leaves at 21:40.",
  },
];

const steps = [
  { title: "Create a key", body: "In your account, open Keys and choose New key." },
  { title: "Paste it here", body: "It stays in this browser." },
  { title: "Ask your first question", body: "Type in the box below and press Enter." },
];

type Message = { id: string; from: "user" | "assistant"; text: string; shown?: number; thinking?: boolean };
type Chat = { id: string; title: string; messages: Message[] };

const words = (text: string) => text.split(" ");

function StepMark({ index, done, current }: { index: number; done: boolean; current: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full text-[13px] font-semibold tabular-nums ring-1 ring-inset",
        "transition-[box-shadow,color] duration-200 ease-settle",
        done
          ? "text-brand-foreground ring-brand"
          : current
            ? "bg-card text-brand-strong ring-2 ring-brand"
            : "bg-card text-muted-foreground ring-border-strong",
      )}
    >
      <motion.span
        className="absolute inset-0 bg-brand"
        style={{ originY: 1 }}
        initial={false}
        animate={{ scaleY: done ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30, delay: index * 0.06 }}
      />
      {done ? (
        <svg viewBox="0 0 16 16" className="relative size-3.5" fill="none">
          <motion.path
            d="M3.5 8.4 6.6 11.4 12.5 5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.24, delay: reduce ? 0 : 0.14 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      ) : (
        <span className="relative">{index + 1}</span>
      )}
    </span>
  );
}

function KeyCard({
  saved,
  fresh,
  onSave,
  onRemove,
}: {
  saved: string | null;
  fresh: boolean;
  onSave: (key: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const heading = useId();
  const done = saved != null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const key = value.trim();
    if (key.length < 12) {
      setError(key ? "Keys are at least 12 characters. Check you copied all of it." : "Paste your key first.");
      return;
    }
    setError(null);
    setValue("");
    onSave(key);
  }

  return (
    <section
      aria-labelledby={heading}
      className="w-full max-w-[26rem] rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-strong">
        <KeyRound className="size-5" />
      </span>
      <h1 id={heading} className="mt-4 text-xl leading-7 font-semibold tracking-[-0.015em]">
        {fresh ? "Key saved" : done ? "Your API key" : "Add an API key to start"}
      </h1>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        {fresh
          ? "That is everything. Ask your first question below."
          : done
            ? "Kitakaze Guide answers with this key. Remove it to stop answering from this browser."
            : "Kitakaze Guide answers with your own key, three steps from here."}
      </p>
      <form onSubmit={submit} noValidate>
        <ol className="mt-5 flex flex-col">
          {steps.map((step, i) => {
            const stepDone = done && i < 2;
            const current = done ? i === 2 : i === 1;
            return (
              <li key={step.title} className="relative flex gap-3.5 pb-4 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute start-3.5 top-8 bottom-1 w-px -translate-x-1/2 rtl:translate-x-1/2",
                      stepDone ? "bg-brand" : "bg-border-strong",
                    )}
                  />
                )}
                <StepMark index={i} done={stepDone} current={current} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm leading-6 font-medium">
                    {step.title}
                    {stepDone && <span className="sr-only">, done</span>}
                  </p>
                  {i === 1 && !done ? (
                    <TextField
                      aria-label="API key"
                      type="password"
                      autoComplete="off"
                      spellCheck="false"
                      placeholder="Paste your key"
                      value={value}
                      onChange={(v) => {
                        setValue(v);
                        if (error) setError(null);
                      }}
                      isInvalid={error != null}
                      errorMessage={error}
                      description={error ? undefined : step.body}
                      className="mt-2"
                    />
                  ) : i === 1 && saved ? (
                    <p className="mt-0.5 font-mono text-[13px] text-muted-foreground">•••• •••• {saved.slice(-4)}</p>
                  ) : (
                    <p className="text-[13px] leading-5 text-muted-foreground">{step.body}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {fresh ? null : done ? (
          <Button variant="secondary" className="mt-5 w-full" onPress={onRemove}>
            Remove key
          </Button>
        ) : (
          <Button type="submit" className="mt-5 w-full">
            Save key
          </Button>
        )}
      </form>
    </section>
  );
}

function Greeting({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
        <Compass className="size-5" />
      </span>
      <h1 className="mt-4 text-2xl leading-8 font-semibold tracking-[-0.02em]">Where are you headed?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Ask about routes, snow, trains or where to stay. Answers use the 06:00 forecast for Tuesday 16 February.
      </p>
      <ul className="mt-6 flex w-full flex-col gap-1.5">
        {samples.map((s) => (
          <li key={s.prompt}>
            <button
              type="button"
              onClick={() => onPick(s.prompt)}
              className="flex w-full cursor-default items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-start text-sm shadow-xs outline-none transition-[border-color,background-color] duration-150 hover:border-border-strong hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <span className="min-w-0 flex-1">{s.prompt}</span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.from === "user") {
    return (
      <div className="flex justify-end ps-10 sm:ps-20">
        <p className="rounded-2xl rounded-ee-md bg-secondary px-4 py-2.5 text-base leading-7 text-secondary-foreground ring-1 ring-foreground/5 ring-inset [overflow-wrap:anywhere]">
          {message.text}
        </p>
      </div>
    );
  }
  if (message.thinking) return <ThinkingGlyph variant="thinking" label="Reading the 06:00 forecast" />;
  const all = words(message.text);
  const shown = message.shown ?? all.length;
  const streaming = shown < all.length;
  return (
    <div className="text-base leading-7">
      <p className="sr-only">{streaming ? "" : message.text}</p>
      <p aria-hidden="true">
        {all.slice(0, shown).join(" ")}
        {streaming && (
          <span className="ms-0.5 inline-block h-[1.1em] w-[3px] translate-y-[3px] rounded-full bg-brand motion-safe:animate-pulse" />
        )}
      </p>
    </div>
  );
}

export interface ChatShellProps extends ComponentProps<"div"> {
  user?: FloatingSidebarUser;
  respond?: (message: string) => string | Promise<string>;
}

export function ChatShell({ user = defaultUser, respond, className, ...props }: ChatShellProps) {
  const lg = useMedia("(min-width: 1024px)");
  const [menu, setMenu] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "keys">("chat");
  const [chats, setChats] = useState<Chat[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [status, setStatus] = useState<PromptBoxStatus>("idle");
  const [announce, setAnnounce] = useState("");
  const [fresh, setFresh] = useState(false);
  const timers = useRef<number[]>([]);
  const turn = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const follow = useRef(false);

  const chat = chats.find((c) => c.id === current) ?? null;
  const messages = chat?.messages ?? [];
  const here = view === "keys" ? "keys" : (current ?? "new");
  const title = view === "keys" ? "API key" : (chat?.title ?? "New chat");

  useEffect(() => () => timers.current.forEach((t) => window.clearInterval(t)), []);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !follow.current) return;
    follow.current = false;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chats]);

  function clearTimers() {
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current = [];
  }

  function patch(chatId: string, id: string, next: Partial<Message>) {
    setChats((list) =>
      list.map((c) =>
        c.id === chatId ? { ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, ...next } : m)) } : c,
      ),
    );
  }

  function stream(chatId: string, id: string, text: string) {
    const total = words(text).length;
    let shown = 0;
    patch(chatId, id, { text, shown: 0, thinking: false });
    const tick = window.setInterval(() => {
      shown += 1;
      follow.current = true;
      patch(chatId, id, { shown });
      if (shown >= total) {
        window.clearInterval(tick);
        setStatus("idle");
        setAnnounce(text);
      }
    }, 55);
    timers.current.push(tick);
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || status === "streaming") return;
    const stamp = Date.now();
    const chatId = current ?? `chat-${stamp}`;
    const replyId = `a-${stamp}`;
    const sample = samples.find((s) => s.prompt === clean) ?? samples[turn.current % samples.length];
    turn.current += 1;
    const next: Message[] = [
      { id: `u-${stamp}`, from: "user", text: clean },
      { id: replyId, from: "assistant", text: "", thinking: true },
    ];
    follow.current = true;
    setView("chat");
    setFresh(false);
    setStatus("streaming");
    setAnnounce("");
    setChats((list) =>
      list.some((c) => c.id === chatId)
        ? list.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, ...next] } : c))
        : [
            { id: chatId, title: clean.length > 32 ? `${clean.slice(0, 30).trimEnd()}…` : clean, messages: next },
            ...list,
          ],
    );
    setCurrent(chatId);
    const wait = new Promise<void>((resolve) => timers.current.push(window.setTimeout(resolve, 700)));
    const reply = respond ? await Promise.resolve(respond(clean)) : sample.reply;
    await wait;
    stream(chatId, replyId, reply);
  }

  function stop() {
    clearTimers();
    setStatus("idle");
    setChats((list) =>
      list.map((c) => ({
        ...c,
        messages: c.messages
          .filter((m) => !m.thinking)
          .map((m) =>
            m.shown != null && m.shown < words(m.text).length
              ? { ...m, text: words(m.text).slice(0, m.shown).join(" "), shown: undefined }
              : m,
          ),
      })),
    );
  }

  function navigate(id: string) {
    setMenu(false);
    setFresh(false);
    if (id === "keys") {
      setView("keys");
      return;
    }
    if (status === "streaming") stop();
    setView("chat");
    setCurrent(id === "new" ? null : id);
  }

  const items: FloatingSidebarItem[] = [
    { id: "new", label: "New chat", icon: <SquarePen /> },
    { id: "keys", label: "API key", icon: <KeyRound /> },
  ];
  const groups: FloatingSidebarGroup[] =
    chats.length > 0
      ? [{ label: "This session", items: chats.map((c) => ({ id: c.id, label: c.title, icon: <MessageSquare /> })) }]
      : [];

  const sidebar = (drawer: boolean) => (
    <FloatingSidebar
      teams={teams}
      items={items}
      groups={groups}
      user={user}
      current={here}
      onNavigate={navigate}
      collapsed={drawer ? false : undefined}
      collapsible={!drawer}
      className={drawer ? "min-h-0 flex-1" : "hidden lg:flex"}
    />
  );

  const showKeyCard = view === "keys" || fresh || (key == null && messages.length === 0);

  return (
    <div {...props} className={cn("flex h-dvh gap-3 bg-background p-3 text-foreground", className)}>
      {sidebar(false)}
      <Drawer
        side="left"
        isOpen={menu && !lg}
        onOpenChange={setMenu}
        closeButton={false}
        aria-label="Sidebar"
        className="w-[264px] border-0 bg-transparent shadow-none"
      >
        {sidebar(true)}
      </Drawer>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center gap-2 ps-0.5 lg:ps-2">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open sidebar"
            onPress={() => setMenu(true)}
            className="text-muted-foreground data-[hovered]:text-foreground lg:hidden"
          >
            <PanelLeft />
          </IconButton>
          <Breadcrumbs className="flex-nowrap">
            <Breadcrumb href="#" className="max-sm:hidden" linkProps={{ onPress: () => navigate("new") }}>
              Kitakaze Guide
            </Breadcrumb>
            <Breadcrumb>{title}</Breadcrumb>
          </Breadcrumbs>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            {key ? (
              <Badge tone="success" dot>
                Key saved
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                No API key
              </Badge>
            )}
            {chat && view === "chat" && (
              <Button
                variant="secondary"
                size="sm"
                iconStart={<SquarePen />}
                onPress={() => navigate("new")}
                className="max-sm:hidden"
              >
                New chat
              </Button>
            )}
          </div>
        </header>

        <div
          ref={scroller}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,#000_20px)] [scrollbar-gutter:stable] [scrollbar-width:thin]"
        >
          <div className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col px-1 pt-6 pb-8 sm:px-6">
            {showKeyCard ? (
              <div className="flex flex-1 items-center justify-center py-6">
                <KeyCard
                  saved={key}
                  fresh={fresh}
                  onSave={(k) => {
                    setKey(k);
                    setView("chat");
                    setFresh(true);
                    setAnnounce("Key saved. Ask your first question in the message box.");
                    document.querySelector<HTMLTextAreaElement>("[data-chat-shell-prompt] textarea")?.focus();
                    timers.current.push(window.setTimeout(() => setFresh(false), 1400));
                  }}
                  onRemove={() => {
                    setKey(null);
                    setAnnounce("Key removed.");
                  }}
                />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-6">
                <Greeting onPick={send} />
              </div>
            ) : (
              <>
                <p className="mb-6 text-center text-xs text-muted-foreground">Tuesday 16 February</p>
                <ol aria-label="Messages" className="flex flex-col gap-7">
                  {messages.map((m) => (
                    <li key={m.id}>
                      <Bubble message={m} />
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
          <div className="sticky bottom-0 z-10 mx-auto w-full max-w-[44rem] sm:px-6">
            <div aria-hidden="true" className="h-6 bg-gradient-to-t from-background to-transparent" />
            <div className="bg-background pb-1" data-chat-shell-prompt="">
              <PromptBox
                placeholder={key ? "Ask about a trip" : "Add a key above to start asking"}
                canSend={key ? undefined : false}
                models={models}
                defaultModel="standard"
                showAttach={false}
                status={status}
                onSend={send}
                onStop={stop}
                maxRows={6}
              />
            </div>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
      </main>
    </div>
  );
}

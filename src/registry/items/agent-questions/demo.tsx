"use client";

import { useState } from "react";
import { AgentQuestions, type AgentQuestionsQuestion } from "@/components/miyuki-ui/agent-questions";
import { Button } from "@/components/miyuki-ui/button";

const questions: AgentQuestionsQuestion[] = [
  {
    id: "days",
    title: "How many days do you have?",
    help: "Count the travel days to and from the trailhead too.",
    type: "single",
    options: [
      { id: "one", label: "A day trip", description: "Up and back before dark." },
      { id: "two", label: "Two days", description: "One night in a hut." },
      { id: "four", label: "Three or four days", description: "A traverse with two huts." },
      { id: "week", label: "A week", description: "Room for a weather day or two." },
    ],
  },
  {
    id: "terrain",
    title: "What kind of terrain do you want?",
    help: "Choose any that apply.",
    type: "multiple",
    allowOther: true,
    options: [
      { id: "forest", label: "Forest trails", description: "Sheltered, good when visibility is poor." },
      { id: "ridges", label: "Ridges", description: "Exposed, with the best views." },
      { id: "snow", label: "Snow slopes", description: "Crampons and an ice axe needed." },
    ],
  },
  {
    id: "sleep",
    title: "Where would you like to sleep?",
    type: "single",
    allowOther: true,
    options: [
      { id: "staffed", label: "Staffed huts", description: "Dinner and breakfast included." },
      { id: "winter-room", label: "Winter rooms", description: "Unstaffed, bring your own food." },
      { id: "onsen", label: "A ryokan in the valley", description: "Hot springs each night, longer days." },
    ],
  },
  {
    id: "avoid",
    title: "Anything you want to avoid?",
    help: "I will route around these where I can.",
    type: "multiple",
    allowOther: true,
    options: [
      { id: "steep", label: "Slopes steeper than 30°", description: "Where most avalanches start." },
      { id: "chains", label: "Chains and ladders" },
      { id: "roads", label: "Long road walks" },
    ],
  },
];

export default function AgentQuestionsDemo() {
  const [state, setState] = useState<"asking" | "done" | "closed">("asking");
  const [round, setRound] = useState(0);

  if (state !== "asking") {
    return (
      <div className="flex w-full max-w-[520px] flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-10 text-center">
        <p className="text-sm text-foreground">
          {state === "done"
            ? "Thanks. Drafting a route that fits your answers."
            : "Questions skipped. I will plan with the defaults."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => {
            setRound((r) => r + 1);
            setState("asking");
          }}
        >
          Answer again
        </Button>
      </div>
    );
  }

  return (
    <AgentQuestions
      key={round}
      className="max-w-[520px]"
      questions={questions}
      onComplete={() => setState("done")}
      onClose={() => setState("closed")}
    />
  );
}

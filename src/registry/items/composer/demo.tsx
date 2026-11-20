"use client";

import { motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { Composer } from "@/components/miyuki-ui/composer";
import { people } from "@/registry/lib/data";

const byName = (name: string) => people.find((p) => p.name === name) ?? people[0];
const lars = byName("Lars Eriksen");
const aiko = byName("Aiko Tanaka");
const mei = byName("Mei Watanabe");
const team = people.slice(0, 8).map((p) => ({ id: p.handle, name: p.name, avatar: p.avatar }));
const pattern = new RegExp(
  `(\\*\\*[^*]+\\*\\*|_[^_]+_|\\[[^\\]]*\\]\\([^)]*\\)|@(?:${team.map((p) => p.name).join("|")}))`,
);

function rich(text: string): ReactNode[] {
  return text.split(pattern).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("[")) return <u key={i}>{part.slice(1, part.indexOf("]"))}</u>;
    if (part.startsWith("@"))
      return (
        <span key={i} className="font-medium text-brand-strong">
          {part}
        </span>
      );
    return part;
  });
}

interface Comment {
  id: string;
  name: string;
  role: string;
  avatar: string;
  time: string;
  text: string;
}

const thread: Comment[] = [
  {
    id: "lars",
    name: lars.name,
    role: lars.role,
    avatar: lars.avatar,
    time: "7:40",
    text: "Kurodake ridge is open again. **Wind crust above the col**, so carry crampons. Below the hut it is soft and knee deep.",
  },
  {
    id: "aiko",
    name: aiko.name,
    role: aiko.role,
    avatar: aiko.avatar,
    time: "8:15",
    text: "Thanks @Lars Eriksen. I am taking a group of six up at nine. Is the traverse to the summit flagged yet?",
  },
];

export default function ComposerDemo() {
  const [comments, setComments] = useState(thread);

  return (
    <div className="flex w-full max-w-xl flex-col gap-5">
      <ol className="flex flex-col gap-5">
        {comments.map((c) => (
          <motion.li
            key={c.id}
            initial={c.id.startsWith("reply") ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="flex gap-3"
          >
            <Avatar src={c.avatar} name={c.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5 font-medium">{c.name}</p>
              <p className="text-xs leading-4 text-muted-foreground">
                {c.role} · {c.time}
              </p>
              <p className="mt-1.5 text-sm leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">{rich(c.text)}</p>
            </div>
          </motion.li>
        ))}
      </ol>
      <div className="flex gap-3">
        <Avatar src={mei.avatar} name={mei.name} size="md" className="mt-1.5" />
        <Composer
          className="min-w-0 flex-1"
          placeholder="Reply to the thread…"
          mentions={team}
          onSubmit={(text) =>
            new Promise<void>((resolve) => {
              const now = new Date();
              const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
              setTimeout(() => {
                setComments((list) => [
                  ...list,
                  { id: `reply-${list.length}`, name: mei.name, role: mei.role, avatar: mei.avatar, time, text },
                ]);
                resolve();
              }, 700);
            })
          }
        />
      </div>
    </div>
  );
}

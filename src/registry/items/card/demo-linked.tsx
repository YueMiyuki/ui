"use client";

import { ToggleButton } from "react-aria-components";
import { buttonStyles } from "@/components/miyuki-ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardMedia,
  CardTitle,
} from "@/components/miyuki-ui/card";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { landscape } from "@/registry/lib/art";

const articles = [
  {
    slug: "snow-depth",
    title: "How we measure snow depth on the ridge",
    description: "Three stakes, a laser and a notebook, read at six every morning.",
    mood: "snow",
    date: "12 November",
    minutes: 6,
  },
  {
    slug: "kiso-winter-timetable",
    title: "The Kiso line winter timetable",
    description: "Fewer trains after eight in the evening, and a later first train from Nagiso.",
    mood: "dawn",
    date: "4 November",
    minutes: 4,
  },
  {
    slug: "avalanche-bulletin",
    title: "Reading an avalanche bulletin",
    description: "What the five danger levels mean, and how to plan a day around them.",
    mood: "day",
    date: "28 October",
    minutes: 9,
  },
] as const;

export default function CardLinkedDemo() {
  return (
    <div className="@container w-full max-w-4xl">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
        {articles.map((article) => (
          <Card key={article.slug}>
            <CardMedia
              src={landscape(article.slug, { width: 640, height: 360, mood: article.mood })}
              alt=""
              aspect="16 / 9"
            />
            <CardHeader>
              <CardTitle href={`#${article.slug}`}>{article.title}</CardTitle>
              <CardDescription>{article.description}</CardDescription>
              <CardAction>
                <ToggleButton
                  aria-label="Save for later"
                  className={buttonStyles({ variant: "ghost", size: "sm", iconOnly: true })}
                >
                  {({ isSelected }) => (
                    <MorphIcon
                      shapes={morphIcons.bookmark}
                      shape={isSelected ? "on" : "off"}
                      size={16}
                      className={isSelected ? "text-brand" : "text-muted-foreground"}
                    />
                  )}
                </ToggleButton>
              </CardAction>
            </CardHeader>
            <CardFooter className="mt-auto text-xs text-muted-foreground">
              <time>{article.date}</time>
              <span aria-hidden="true">·</span>
              <span>{article.minutes} min read</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

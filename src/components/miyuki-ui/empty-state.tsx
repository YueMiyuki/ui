"use client";

import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateIllustration = "search" | "inbox" | "folder" | "start";
export type EmptyStateSize = "sm" | "md" | "lg";

const keyframes = `
@keyframes miyuki-empty-state-rock { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-4deg); } }
@keyframes miyuki-empty-state-fall {
  0% { transform: translate(-3px, -7px) rotate(0deg); opacity: 0; }
  15% { opacity: 1; }
  45% { transform: translate(2.5px, 4px) rotate(30deg); }
  80% { transform: translate(0, 19px) rotate(55deg); opacity: 1; }
  92%, 100% { transform: translate(0, 20px) rotate(60deg); opacity: 0; }
}
@keyframes miyuki-empty-state-lift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes miyuki-empty-state-stir {
  0%, 100% { transform: skewY(0deg) scaleX(1); }
  30% { transform: skewY(-5deg) scaleX(0.94); }
  60% { transform: skewY(2deg) scaleX(1.02); }
}
`;

const artWidth: Record<EmptyStateSize, string> = { sm: "w-20", md: "w-24", lg: "w-[120px]" };

function SearchArt() {
  return (
    <>
      <path d="M6 60C15 57.5 24 39.2 43 39.2C60 39.2 72 53 90 60Z" fill="currentColor" stroke="none" opacity={0.07} />
      <path d="M4 60H92" opacity={0.45} />
      <path d="M6 60C15 57.5 24 39.2 43 39.2C60 39.2 72 53 90 60" />
      <path
        d="M13.51 57.7L15.65 56.63M16.91 53.09L19.05 52.02M22.63 53.14L24.77 52.07M26.02 48.54L28.17 47.46M31.75 48.58L33.89 47.51M35.14 43.98L37.29 42.9"
        strokeWidth={2}
        opacity={0.75}
      />
      <g
        className="animate-[miyuki-empty-state-rock_9s_ease-in-out_infinite] [transform-box:view-box] motion-reduce:animate-none"
        style={{ transformOrigin: "43px 38.5px" }}
      >
        <circle cx={43} cy={25} r={12.5} />
        <path d="M34.73 21.99A8.8 8.8 0 0 1 40.72 16.5" className="text-brand" />
        <g transform="rotate(40 43 25)">
          <path d="M55.5 25H58.5" />
          <rect x={58.5} y={22.25} width={13.5} height={5.5} rx={2.75} />
        </g>
      </g>
    </>
  );
}

function InboxArt() {
  return (
    <>
      <path
        d="M14 41L22 30H74L82 41H63C60 41 59.5 46 56 46H40C36.5 46 36 41 33 41Z"
        fill="currentColor"
        stroke="none"
        opacity={0.07}
      />
      <path d="M14 41L22 30H74L82 41" />
      <path d="M14 41H33C36 41 36.5 46 40 46H56C59.5 46 60 41 63 41H82" />
      <path d="M14 41L19 61H77L82 41" />
      <path d="M10 65.5H86" opacity={0.45} />
      <g className="text-brand animate-[miyuki-empty-state-fall_10s_ease-in-out_infinite] [transform-box:fill-box] origin-center motion-reduce:animate-none">
        <path d="M48 7.5V20.5M42.4 10.75L53.6 17.25M42.4 17.25L53.6 10.75" />
        <path d="M46.4 8.9L48 9.8L49.6 8.9M46.4 19.1L48 18.2L49.6 19.1M51.3 18.1L51.3 16.2L52.9 15.3M43.1 15.3L44.7 16.2L44.7 18.1M44.7 9.9L44.7 11.8L43.1 12.7M52.9 12.7L51.3 11.8L51.3 9.9" />
      </g>
    </>
  );
}

function FolderArt() {
  const clip = useId();
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={96} height={33} />
        </clipPath>
      </defs>
      <path d="M16 61V16.5C16 15.4 16.9 14.5 18 14.5H31L35 19.5H36" />
      <path d="M62 19.5H72C73.1 19.5 74 20.4 74 21.5V33" />
      <g clipPath={`url(#${clip})`}>
        <g className="animate-[miyuki-empty-state-lift_8s_ease-in-out_infinite] motion-reduce:animate-none">
          <path d="M36 40V10C36 8.9 36.9 8 38 8H60C61.1 8 62 8.9 62 10V40" />
          <path d="M41 14H50" className="text-brand" />
          <path d="M41 19H57M41 24H54M41 29H56" />
        </g>
      </g>
      <path d="M16 61L23 33H81L74 61Z" fill="currentColor" fillOpacity={0.07} />
    </>
  );
}

function StartArt() {
  return (
    <>
      <path d="M69 36.9L77 29L93 43" opacity={0.45} />
      <path d="M3 62L20 47L28 52L46 24L58 38L65 33L93 60" />
      <path d="M40.2 33L43.5 35.5L46.5 32.5L50 35.5L53.7 33" />
      <path d="M46 24V5" />
      <g className="text-brand animate-[miyuki-empty-state-stir_8s_ease-in-out_infinite] [transform-box:fill-box] origin-left motion-reduce:animate-none">
        <path d="M46 6C50.5 4.5 54.5 8 60 6.5V15.5C54.5 17 50.5 13.5 46 15Z" fill="currentColor" fillOpacity={0.15} />
      </g>
    </>
  );
}

const drawings: Record<EmptyStateIllustration, () => ReactNode> = {
  search: SearchArt,
  inbox: InboxArt,
  folder: FolderArt,
  start: StartArt,
};

function Illustration({ name, size }: { name: EmptyStateIllustration; size: EmptyStateSize }) {
  const Drawing = drawings[name];
  return (
    <>
      <style href="miyuki-empty-state" precedence="miyuki">
        {keyframes}
      </style>
      <svg
        viewBox="0 0 96 72"
        width={96}
        height={72}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={cn("h-auto shrink-0 text-muted-foreground [&_*]:[vector-effect:non-scaling-stroke]", artWidth[size])}
      >
        <Drawing />
      </svg>
    </>
  );
}

const padding: Record<EmptyStateSize, string> = { sm: "px-4 py-8", md: "px-6 py-12", lg: "px-8 py-16" };
const pictureGap: Record<EmptyStateSize, string> = { sm: "mb-3", md: "mb-4", lg: "mb-5" };
const actionsGap: Record<EmptyStateSize, string> = { sm: "mt-4", md: "mt-5", lg: "mt-6" };

export interface EmptyStateProps extends Omit<ComponentProps<"div">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  illustration?: EmptyStateIllustration;
  icon?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  size?: EmptyStateSize;
  bordered?: boolean;
}

export function EmptyState({
  title,
  description,
  illustration,
  icon,
  media,
  actions,
  size = "md",
  bordered = false,
  className,
  ...props
}: EmptyStateProps) {
  const picture =
    illustration != null ? (
      <Illustration name={illustration} size={size} />
    ) : icon != null ? (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          size === "sm" ? "size-10 [&_svg]:size-5" : "size-12 [&_svg]:size-6",
        )}
      >
        {icon}
      </span>
    ) : (
      media
    );

  return (
    <div
      {...props}
      className={cn(
        "flex w-full flex-col items-center justify-center text-center",
        padding[size],
        bordered && "rounded-xl border border-dashed border-border-strong",
        className,
      )}
    >
      <div className="flex w-full max-w-sm flex-col items-center">
        {picture != null ? <div className={cn("flex justify-center", pictureGap[size])}>{picture}</div> : null}
        {title != null ? (
          <div
            className={cn(
              "font-medium text-balance text-foreground [overflow-wrap:anywhere]",
              size === "lg" ? "text-lg" : "text-base",
            )}
          >
            {title}
          </div>
        ) : null}
        {description != null ? (
          <div className={cn("text-sm text-pretty text-muted-foreground", title != null && "mt-1")}>{description}</div>
        ) : null}
        {actions != null ? (
          <div className={cn("flex flex-wrap items-center justify-center gap-2", actionsGap[size])}>{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import { composeRenderProps } from "react-aria-components";
import {
  siApple,
  siAtlassian,
  siAuth0,
  siBitbucket,
  siDiscord,
  siDropbox,
  siFacebook,
  siFigma,
  siGithub,
  siGitlab,
  siGoogle,
  siKakaotalk,
  siLine,
  siNotion,
  siOkta,
  siPaypal,
  siReddit,
  siSpotify,
  siSteam,
  siTelegram,
  siTwitch,
  siWechat,
  siX,
} from "simple-icons";
import { Button, type ButtonProps, type ButtonSize } from "@/components/miyuki-ui/button";
import { cn } from "@/lib/utils";

export type SocialProvider =
  | "google"
  | "apple"
  | "github"
  | "x"
  | "facebook"
  | "discord"
  | "gitlab"
  | "bitbucket"
  | "twitch"
  | "spotify"
  | "notion"
  | "figma"
  | "dropbox"
  | "reddit"
  | "line"
  | "kakao"
  | "wechat"
  | "yahoo"
  | "okta"
  | "auth0"
  | "atlassian"
  | "paypal"
  | "steam"
  | "telegram";

export type SocialButtonVariant = "outline" | "solid" | "icon";

interface ProviderMark {
  name: string;
  hex: string;
  path: string;
  evenOdd?: boolean;
}

const yahooTile =
  "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z" +
  "M5.6 6.5h2.6l1.85 3.5 1.85-3.5h2.6l-3.3 5.9v5.1H8.9v-5.1Z" +
  "M16.3 6.5h2.1l-.45 7.1h-1.2Z" +
  "M16.2 16.3a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0Z";

const mark = (icon: { title: string; hex: string; path: string }, name = icon.title): ProviderMark => ({
  name,
  hex: icon.hex,
  path: icon.path,
});

export const socialProviders: Record<SocialProvider, ProviderMark> = {
  google: mark(siGoogle),
  apple: mark(siApple),
  github: mark(siGithub),
  x: mark(siX),
  facebook: mark(siFacebook),
  discord: mark(siDiscord),
  gitlab: mark(siGitlab),
  bitbucket: mark(siBitbucket),
  twitch: mark(siTwitch),
  spotify: mark(siSpotify),
  notion: mark(siNotion),
  figma: mark(siFigma),
  dropbox: mark(siDropbox),
  reddit: mark(siReddit),
  line: mark(siLine),
  kakao: mark(siKakaotalk, "Kakao"),
  wechat: mark(siWechat),
  yahoo: { name: "Yahoo", hex: "6001D2", path: yahooTile, evenOdd: true },
  okta: mark(siOkta),
  auth0: mark(siAuth0),
  atlassian: mark(siAtlassian),
  paypal: mark(siPaypal),
  steam: mark(siSteam),
  telegram: mark(siTelegram),
};

type Rgb = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToLinear(hex: string): Rgb {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255)) as Rgb;
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const CARD_LIGHT = 1;
const CARD_DARK = 0.0093;
const SNOW = "oklch(0.99 0.004 236)";
const SNOW_L = 0.971;
const INK = "oklch(0.22 0.03 248)";

const markOn = (l: number, surface: number) => contrast(l, surface) >= 3;

interface Palette {
  light: string;
  dark: string;
  fill: string | null;
  label: string;
}

function paletteFor(hex: string): Palette {
  const rgb = hexToLinear(hex);
  const l = luminance(rgb);
  const light = markOn(l, CARD_LIGHT) ? `#${hex}` : "currentColor";
  const dark = markOn(l, CARD_DARK) ? `#${hex}` : "currentColor";

  if (l < 0.02) return { light, dark, fill: null, label: "" };

  if (contrast(l, SNOW_L) < 3) return { light, dark, fill: `#${hex}`, label: INK };

  let fill = rgb;
  let k = 1;
  while (contrast(luminance(fill), SNOW_L) < 4.5 && k > 0.5) {
    k -= 0.01;
    fill = rgb.map((c) => c * k) as Rgb;
  }
  const css = `#${fill
    .map((c) =>
      Math.round(fromLinear(c) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
  return { light, dark, fill: css, label: SNOW };
}

const palettes = Object.fromEntries(
  Object.entries(socialProviders).map(([key, p]) => [key, paletteFor(p.hex)]),
) as Record<SocialProvider, Palette>;

function Mark({ provider, className }: { provider: SocialProvider; className?: string }) {
  const p = socialProviders[provider];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path d={p.path} fill="currentColor" fillRule={p.evenOdd ? "evenodd" : undefined} />
    </svg>
  );
}

export interface SocialButtonProps extends Omit<ButtonProps, "variant" | "iconStart" | "iconEnd"> {
  provider: SocialProvider;
  variant?: SocialButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

export function SocialButton({
  provider,
  variant = "outline",
  size = "md",
  children,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: SocialButtonProps) {
  const p = socialProviders[provider];
  const pal = palettes[provider];
  const label = `Continue with ${p.name}`;
  const solid = variant === "solid";
  const ink = solid && pal.fill === null;

  const vars = {
    "--miyuki-social-mark": pal.light,
    "--miyuki-social-mark-dark": pal.dark,
    ...(solid && pal.fill ? { "--miyuki-social-fill": pal.fill, "--miyuki-social-label": pal.label } : null),
  } as CSSProperties;

  return (
    <Button
      {...props}
      variant={ink ? "primary" : "secondary"}
      size={size}
      aria-label={ariaLabel ?? (variant === "icon" ? label : undefined)}
      iconStart={
        <Mark
          provider={provider}
          className={cn(
            !solid && "text-(--miyuki-social-mark) dark:text-(--miyuki-social-mark-dark)",
            size === "lg" && "size-[18px]!",
          )}
        />
      }
      style={composeRenderProps(style, (s) => ({ ...vars, ...s }))}
      className={composeRenderProps(className, (cls) =>
        cn(
          solid &&
            !ink &&
            "border-transparent bg-(--miyuki-social-fill) text-(--miyuki-social-label) data-[hovered]:bg-(--miyuki-social-fill)/90",
          ink && "border border-transparent",
          cls,
        ),
      )}
    >
      {variant === "icon" ? undefined : (children ?? label)}
    </Button>
  );
}

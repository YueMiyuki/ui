"use client";

import { User } from "lucide-react";
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "rounded";
export type AvatarStatus = "online" | "away" | "busy" | "offline";

interface SizeSpec {
  px: number;
  text: string;
  corner: string;
  dot: number;
  ring: number;
  overlap: number;
  icon: string;
}

const sizes: Record<AvatarSize, SizeSpec> = {
  xs: { px: 20, text: "text-[9px]", corner: "rounded-[5px]", dot: 6, ring: 1.5, overlap: 5, icon: "size-3" },
  sm: { px: 24, text: "text-[10px]", corner: "rounded-sm", dot: 7, ring: 1.5, overlap: 6, icon: "size-3.5" },
  md: { px: 32, text: "text-xs", corner: "rounded-md", dot: 9, ring: 2, overlap: 8, icon: "size-4" },
  lg: { px: 40, text: "text-sm", corner: "rounded-lg", dot: 10, ring: 2, overlap: 10, icon: "size-5" },
  xl: { px: 56, text: "text-lg", corner: "rounded-xl", dot: 13, ring: 2.5, overlap: 14, icon: "size-7" },
};

const tints = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-6"];

function tintFor(name: string): CSSProperties {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hue = `var(${tints[(h >>> 0) % tints.length]})`;
  return {
    backgroundColor: `color-mix(in oklab, ${hue} 22%, var(--card))`,
    color: `color-mix(in oklab, ${hue} 42%, var(--foreground))`,
  };
}

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const statusColor: Record<AvatarStatus, string> = {
  online: "bg-success",
  away: "bg-warning",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

const statusLabel: Record<AvatarStatus, string> = {
  online: "online",
  away: "away",
  busy: "busy",
  offline: "offline",
};

const GroupContext = createContext<{ size: AvatarSize } | null>(null);

export interface AvatarProps extends Omit<ComponentProps<"span">, "children"> {
  src?: string;
  name?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  status?: AvatarStatus;
}

export function Avatar({ src, name, size, shape = "circle", status, className, style, ...props }: AvatarProps) {
  const group = useContext(GroupContext);
  const s = sizes[group?.size ?? size ?? "md"];
  const [failed, setFailed] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0 && src) setFailed(src);
  }, [src]);

  const showImage = src != null && src !== "" && failed !== src;
  const initials = name ? initialsOf(name) : "";
  const label = name ? (status ? `${name}, ${statusLabel[status]}` : name) : undefined;
  const corner = shape === "circle" ? "rounded-full" : s.corner;

  const dotOffset = shape === "circle" ? s.px * 0.146 - s.dot / 2 : -s.dot * 0.22;

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
      className={cn("relative inline-flex shrink-0 align-middle select-none", corner, className)}
      style={{
        width: s.px,
        height: s.px,
        ...(group ? { boxShadow: `0 0 0 ${s.ring}px var(--background)` } : null),
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-full items-center justify-center overflow-hidden font-medium leading-none",
          corner,
          s.text,
          !showImage && !initials && "bg-muted text-muted-foreground",
        )}
        style={!showImage && initials ? tintFor(name ?? "") : undefined}
      >
        {showImage ? (
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onError={() => setFailed(src)}
            className="size-full object-cover"
          />
        ) : initials ? (
          <span className="tracking-[0.01em]">{initials}</span>
        ) : (
          <User className={cn("shrink-0", s.icon)} strokeWidth={1.75} />
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 ring-1 ring-inset ring-foreground/8", corner)}
      />
      {status && (
        <span
          aria-hidden="true"
          className={cn("absolute rounded-full", statusColor[status])}
          style={{
            width: s.dot,
            height: s.dot,
            right: dotOffset,
            bottom: dotOffset,
            boxShadow: `0 0 0 ${s.ring}px var(--background)`,
          }}
        />
      )}
    </span>
  );
}

export interface AvatarGroupProps extends ComponentProps<"div"> {
  max?: number;
  size?: AvatarSize;
  children?: ReactNode;
}

export function AvatarGroup({ max, size = "md", className, children, ...props }: AvatarGroupProps) {
  const s = sizes[size];
  const items = Children.toArray(children);
  const shown = max != null && items.length > max ? items.slice(0, Math.max(0, max)) : items;
  const extra = items.length - shown.length;

  return (
    <div role="group" {...props} className={cn("flex items-center", className)}>
      <GroupContext value={{ size }}>
        {shown.map((child, i) => (
          <span key={i} className="flex" style={i > 0 ? { marginInlineStart: -s.overlap } : undefined}>
            {child}
          </span>
        ))}
      </GroupContext>
      {extra > 0 && (
        <span
          role="img"
          aria-label={`${extra} more`}
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground tabular-nums",
            s.text,
          )}
          style={{
            width: s.px,
            height: s.px,
            marginInlineStart: shown.length > 0 ? -s.overlap : 0,
            boxShadow: `0 0 0 ${s.ring}px var(--background)`,
          }}
        >
          <span aria-hidden="true">+{extra}</span>
        </span>
      )}
    </div>
  );
}

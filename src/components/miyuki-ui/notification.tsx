"use client";

import { Bell, Check, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { Avatar } from "@/components/miyuki-ui/avatar";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type NotificationTone = "neutral" | "success" | "warning" | "destructive" | "info";

const tiles: Record<NotificationTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  success: "bg-success-soft text-success-strong",
  warning: "bg-warning-soft text-warning-strong",
  destructive: "bg-destructive-soft text-destructive-strong",
  info: "bg-brand-soft text-brand-strong",
};

const glyphs: Record<NotificationTone, ReactNode> = {
  neutral: <Bell />,
  success: <Check strokeWidth={2.25} />,
  warning: <TriangleAlert />,
  destructive: <CircleAlert />,
  info: <Info />,
};

export interface NotificationProps extends Omit<ComponentProps<"article">, "title" | "children"> {
  tone?: NotificationTone;
  icon?: ReactNode;
  avatar?: string | ReactNode;
  title: ReactNode;
  time?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  unread?: boolean;
}

export function Notification({
  tone = "neutral",
  icon,
  avatar,
  title,
  time,
  children,
  actions,
  onClose,
  closeLabel = "Dismiss",
  unread = false,
  className,
  ...props
}: NotificationProps) {
  const id = useId();
  const leading =
    avatar != null ? (
      typeof avatar === "string" ? (
        <Avatar src={avatar} size="lg" />
      ) : (
        avatar
      )
    ) : (
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 items-center justify-center rounded-full [&_svg]:size-[18px] [&_svg]:shrink-0",
          tiles[tone],
        )}
      >
        {icon ?? glyphs[tone]}
      </span>
    );

  return (
    <article
      aria-labelledby={`${id}-title`}
      {...props}
      className={cn(
        "relative flex w-[360px] max-w-full gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg",
        className,
      )}
    >
      {unread && (
        <span
          aria-hidden="true"
          className="absolute start-[5px] top-9 size-1.5 -translate-y-1/2 rounded-full bg-brand ring-2 ring-popover"
        />
      )}
      <div className="flex shrink-0">{leading}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cn("flex min-w-0 items-baseline gap-x-2 pt-px", onClose && "pe-7")}>
          <h3 id={`${id}-title`} className="min-w-0 truncate text-sm leading-5 font-medium text-foreground">
            {unread && <span className="sr-only">Unread: </span>}
            {title}
          </h3>
          {time != null && (
            <span className="shrink-0 text-xs leading-5 whitespace-nowrap text-muted-foreground tabular-nums">
              {time}
            </span>
          )}
        </div>
        {children != null && (
          <div className="mt-0.5 text-sm leading-5 text-pretty text-muted-foreground">{children}</div>
        )}
        {actions != null && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {onClose && (
        <CloseButton size="md" aria-label={closeLabel} onPress={onClose} className="absolute end-3.5 top-3.5" />
      )}
    </article>
  );
}

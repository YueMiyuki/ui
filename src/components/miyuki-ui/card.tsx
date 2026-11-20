"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { CheckboxButton, CheckboxField, Link } from "react-aria-components";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "outline" | "muted";
export type CardSize = "sm" | "md";

interface CardContextValue {
  size: CardSize;
  selectable: boolean;
  titleId?: string;
  descriptionId?: string;
  onDescription?: (present: boolean) => void;
}

const CardContext = createContext<CardContextValue>({ size: "md", selectable: false });

const surfaces: Record<CardVariant, string> = {
  default: "border-border bg-card shadow-sm",
  outline: "border-border bg-transparent",
  muted: "border-transparent bg-muted",
};

const linkedHover: Record<CardVariant, string> = {
  default: "hover:has-[[data-slot=card-link]]:border-border-strong hover:has-[[data-slot=card-link]]:shadow-md",
  outline: "hover:has-[[data-slot=card-link]]:border-border-strong",
  muted: "hover:has-[[data-slot=card-link]]:bg-accent",
};

const spacing: Record<CardSize, { root: string; x: string; media: string; footer: string; badge: string }> = {
  sm: {
    root: "gap-3 py-4",
    x: "px-4",
    media: "first:-mt-4 last:-mb-4 not-last:mb-1",
    footer: "-mb-1 pt-3",
    badge: "end-4 top-4",
  },
  md: {
    root: "gap-4 py-6",
    x: "px-6",
    media: "first:-mt-6 last:-mb-6 not-last:mb-2",
    footer: "-mb-2 pt-4",
    badge: "end-6 top-6",
  },
};

const base = cn(
  "group/card relative flex flex-col overflow-clip rounded-xl border text-card-foreground",
  "transition-[border-color,box-shadow,background-color] duration-200 ease-settle",
);

const linkedFocus =
  "has-[[data-slot=card-link][data-focus-visible]]:ring-[3px] has-[[data-slot=card-link][data-focus-visible]]:ring-ring";

const lifted =
  "[:where(&:has([data-slot=card-link])_:is(a,button,input,select,textarea,[role=button],[tabindex]):not([data-slot=card-link]))]:relative [:where(&:has([data-slot=card-link])_:is(a,button,input,select,textarea,[role=button],[tabindex]):not([data-slot=card-link]))]:z-[1]";

const FLOOD: Transition = { type: "spring", stiffness: 500, damping: 30, mass: 0.6 };
const DRAW_DELAY = 0.1;
const DRAW: Transition = { duration: 0.16, ease: [0.33, 0, 0.2, 1], delay: DRAW_DELAY };
const OFF: Transition = { duration: 0.1, ease: "easeOut" };
const FADE: Transition = { duration: 0.12, ease: "easeOut" };

function CheckBadge({
  isSelected,
  isHovered,
  isPressed,
  className,
}: {
  isSelected: boolean;
  isHovered: boolean;
  isPressed: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();

  const water = isSelected
    ? {
        scaleY: 1,
        opacity: 1,
        transition: reduce ? { scaleY: { duration: 0 }, opacity: FADE } : { scaleY: FLOOD, opacity: { duration: 0 } },
      }
    : {
        scaleY: reduce ? 1 : 0,
        opacity: 0,
        transition: { opacity: OFF, scaleY: { duration: 0, delay: OFF.duration } },
      };

  const mark = isSelected
    ? {
        pathLength: 1,
        opacity: 1,
        transition: reduce
          ? { pathLength: { duration: 0 }, opacity: FADE }
          : { pathLength: DRAW, opacity: { duration: 0.01, delay: DRAW_DELAY } },
      }
    : {
        pathLength: reduce ? 1 : 0,
        opacity: 0,
        transition: { opacity: OFF, pathLength: { duration: 0, delay: OFF.duration } },
      };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute size-5 rounded-full border bg-card shadow-xs",
        "transition-[border-color,scale] duration-200 ease-settle",
        isSelected ? "border-brand" : isHovered ? "border-border-strong" : "border-input",
        isPressed && "scale-[0.92]",
        className,
      )}
    >
      <span className="absolute -inset-px overflow-hidden rounded-full">
        <motion.span className="absolute inset-0 origin-bottom bg-brand" initial={false} animate={water} />
      </span>
      <svg viewBox="0 0 20 20" fill="none" className="absolute -inset-px size-5 text-brand-foreground">
        <motion.path
          d="M6.1 10.3 8.75 12.9 13.9 7.6"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={mark}
        />
      </svg>
    </span>
  );
}

export interface CardProps extends Omit<ComponentProps<"div">, "onChange"> {
  variant?: CardVariant;
  size?: CardSize;
  selectable?: boolean;
  isSelected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (isSelected: boolean) => void;
  isDisabled?: boolean;
  name?: string;
  value?: string;
}

export function Card({
  variant = "default",
  size = "md",
  selectable = false,
  isSelected,
  defaultSelected,
  onSelectedChange,
  isDisabled,
  name,
  value,
  className,
  children,
  ...props
}: CardProps) {
  const id = useId();
  const [hasDescription, setHasDescription] = useState(false);
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const s = spacing[size];

  if (!selectable) {
    return (
      <CardContext value={{ size, selectable: false }}>
        <div
          data-slot="card"
          {...props}
          className={cn(base, surfaces[variant], s.root, linkedHover[variant], linkedFocus, lifted, className)}
        >
          {children}
        </div>
      </CardContext>
    );
  }

  const labelled = props["aria-label"] != null || props["aria-labelledby"] != null;

  return (
    <CardContext value={{ size, selectable: true, titleId, descriptionId, onDescription: setHasDescription }}>
      <CheckboxField
        data-slot="card"
        {...(props as object)}
        aria-labelledby={labelled ? props["aria-labelledby"] : titleId}
        aria-describedby={props["aria-describedby"] ?? (hasDescription ? descriptionId : undefined)}
        isSelected={isSelected}
        defaultSelected={defaultSelected}
        onChange={onSelectedChange}
        isDisabled={isDisabled}
        name={name}
        value={value}
        className={({ isSelected: on, isDisabled: off }) =>
          cn(
            base,
            surfaces[variant],
            s.root,
            on ? "border-brand ring-1 ring-brand" : "has-[[data-slot=card-check][data-hovered]]:border-border-strong",
            "has-[[data-slot=card-check][data-focus-visible]]:ring-[3px] has-[[data-slot=card-check][data-focus-visible]]:ring-ring",
            off && "opacity-50",
            className,
          )
        }
      >
        {children}
        <CheckboxButton
          data-slot="card-check"
          className="absolute inset-0 z-[1] cursor-default rounded-[inherit] outline-none data-[disabled]:cursor-not-allowed"
        >
          {(state) => (
            <CheckBadge
              isSelected={state.isSelected}
              isHovered={state.isHovered}
              isPressed={state.isPressed}
              className={s.badge}
            />
          )}
        </CheckboxButton>
      </CheckboxField>
    </CardContext>
  );
}

export type CardHeaderProps = ComponentProps<"div">;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  const { size } = useContext(CardContext);
  return (
    <div
      data-slot="card-header"
      {...props}
      className={cn(
        "grid auto-rows-min items-start gap-x-3 gap-y-1.5",
        "has-[[data-slot=card-action]]:grid-cols-[minmax(0,1fr)_auto]",
        spacing[size].x,
        className,
      )}
    />
  );
}

export interface CardTitleProps extends ComponentProps<"h3"> {
  href?: string;
  target?: string;
  rel?: string;
}

export function CardTitle({ href, target, rel, id, className, children, ...props }: CardTitleProps) {
  const { selectable, titleId } = useContext(CardContext);
  return (
    <h3
      data-slot="card-title"
      id={id ?? (selectable ? titleId : undefined)}
      {...props}
      className={cn(
        "col-start-1 row-start-1 text-base leading-tight font-semibold text-pretty text-foreground",
        selectable && "pe-8",
        className,
      )}
    >
      {href != null ? (
        <Link
          href={href}
          target={target}
          rel={rel}
          data-slot="card-link"
          className={cn(
            "cursor-pointer outline-none transition-colors duration-150 ease-settle",
            "after:absolute after:inset-0 after:content-['']",
            "group-hover/card:text-brand-strong data-[focus-visible]:text-brand-strong",
          )}
        >
          {children}
        </Link>
      ) : (
        children
      )}
    </h3>
  );
}

export type CardDescriptionProps = ComponentProps<"p">;

export function CardDescription({ id, className, ...props }: CardDescriptionProps) {
  const { selectable, descriptionId, onDescription } = useContext(CardContext);
  const own = selectable && id == null;

  useLayoutEffect(() => {
    if (!own) return;
    onDescription?.(true);
    return () => onDescription?.(false);
  }, [own, onDescription]);

  return (
    <p
      data-slot="card-description"
      id={own ? descriptionId : id}
      {...props}
      className={cn("col-span-full text-sm text-pretty text-muted-foreground", className)}
    />
  );
}

export type CardActionProps = ComponentProps<"div">;

export function CardAction({ className, ...props }: CardActionProps) {
  return (
    <div
      data-slot="card-action"
      {...props}
      className={cn(
        "relative z-[1] col-start-2 row-start-1 -my-1.5 flex items-center gap-1 self-start justify-self-end",
        className,
      )}
    />
  );
}

export type CardContentProps = ComponentProps<"div">;

export function CardContent({ className, ...props }: CardContentProps) {
  const { size } = useContext(CardContext);
  return <div data-slot="card-content" {...props} className={cn("text-sm", spacing[size].x, className)} />;
}

export interface CardFooterProps extends ComponentProps<"div"> {
  bordered?: boolean;
}

export function CardFooter({ bordered = false, className, ...props }: CardFooterProps) {
  const { size } = useContext(CardContext);
  return (
    <div
      data-slot="card-footer"
      {...props}
      className={cn(
        "flex items-center gap-2 text-sm",
        spacing[size].x,
        bordered && cn("border-t border-border", spacing[size].footer),
        className,
      )}
    />
  );
}

export interface CardMediaProps extends ComponentProps<"div"> {
  src?: string;
  alt?: string;
  aspect?: number | string;
  children?: ReactNode;
}

export function CardMedia({ src, alt = "", aspect = "16 / 9", className, style, children, ...props }: CardMediaProps) {
  const { size } = useContext(CardContext);
  return (
    <div
      data-slot="card-media"
      {...props}
      style={{ aspectRatio: aspect, ...style }}
      className={cn(
        "relative w-full shrink-0 overflow-hidden bg-muted",
        "[&>img]:size-full [&>img]:object-cover [&>video]:size-full [&>video]:object-cover",
        spacing[size].media,
        className,
      )}
    >
      {src != null ? <img src={src} alt={alt} className="size-full object-cover" /> : children}
    </div>
  );
}

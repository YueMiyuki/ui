"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { Button as AriaButton, type ButtonProps as AriaButtonProps, composeRenderProps } from "react-aria-components";
import { cn } from "@/lib/utils";

export type LanternButtonSize = "sm" | "md" | "lg";

export interface LanternButtonProps extends AriaButtonProps {
  lit?: boolean;
  color?: string;
  size?: LanternButtonSize;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const sizes: Record<LanternButtonSize, { box: string; rim: string; paper: string }> = {
  sm: { box: "h-8 px-4 rounded-[12px/50%]", rim: "inset-x-[7px] h-1", paper: "inset-y-[2.5px] rounded-[12px/50%]" },
  md: { box: "h-9 px-[18px] rounded-[14px/50%]", rim: "inset-x-2 h-[5px]", paper: "inset-y-[3px] rounded-[14px/50%]" },
  lg: { box: "h-11 px-6 rounded-[17px/50%]", rim: "inset-x-2.5 h-1.5", paper: "inset-y-[3.5px] rounded-[17px/50%]" },
};

const FIBRE = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='64'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.22 0.5' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.26  0 0 0 0 0.14  0 0 0 0.7 -0.24'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>",
)}")`;

const keyframes = `
@keyframes miyuki-lantern-button-flicker {
  0% { opacity: 0.9; transform: translate(0, 0) scale(1); }
  7% { opacity: 1; transform: translate(0.4px, -0.3px) scale(1.03); }
  13% { opacity: 0.8; transform: translate(-0.3px, 0.2px) scale(0.98); }
  21% { opacity: 0.95; transform: translate(0, 0) scale(1.01); }
  34% { opacity: 0.87; transform: translate(0.2px, 0) scale(1); }
  41% { opacity: 1; transform: translate(-0.5px, -0.4px) scale(1.04); }
  52% { opacity: 0.84; transform: translate(0.3px, 0.3px) scale(0.99); }
  66% { opacity: 0.97; transform: translate(0, -0.2px) scale(1.02); }
  73% { opacity: 0.83; transform: translate(-0.2px, 0) scale(0.99); }
  85% { opacity: 0.95; transform: translate(-0.2px, 0.1px) scale(1); }
  100% { opacity: 0.9; transform: translate(0, 0) scale(1); }
}
@keyframes miyuki-lantern-button-sway {
  0%, 100% { transform: translateX(-3%); }
  50% { transform: translateX(3%); }
}
@keyframes miyuki-lantern-button-breathe {
  0%, 100% { opacity: 1; }
  31% { opacity: 0.94; }
  58% { opacity: 0.99; }
  79% { opacity: 0.92; }
}
`;

const wood = cn(
  "absolute rounded-[3px]",
  "bg-[repeating-linear-gradient(90deg,transparent_0_6px,oklch(0.28_0.05_45/0.22)_6px_7px,transparent_7px_13px),linear-gradient(180deg,oklch(0.6_0.075_62),oklch(0.45_0.075_52)_50%,oklch(0.35_0.06_46))]",
  "dark:bg-[repeating-linear-gradient(90deg,transparent_0_6px,oklch(0.2_0.04_45/0.3)_6px_7px,transparent_7px_13px),linear-gradient(180deg,oklch(0.5_0.065_60),oklch(0.38_0.06_50)_50%,oklch(0.29_0.05_45))]",
  "shadow-[0_1px_1px_oklch(0.25_0.04_45/0.3)]",
);

export function LanternButton({
  lit = false,
  color = "var(--chart-4)",
  size = "md",
  iconStart,
  iconEnd,
  className,
  style,
  children,
  ...props
}: LanternButtonProps) {
  const s = sizes[size];

  return (
    <AriaButton
      {...props}
      style={composeRenderProps(style, (st) => ({ "--miyuki-lantern-button-light": color, ...st }) as CSSProperties)}
      className={composeRenderProps(className, (cls, { isHovered, isPressed, isFocusVisible }) => {
        const glowing = lit || isHovered || isPressed || isFocusVisible;
        return cn(
          "group/lantern relative isolate inline-flex shrink-0 cursor-default items-center justify-center gap-2 text-sm font-medium whitespace-nowrap select-none outline-none",
          "transition-[scale,box-shadow,color] ease-out data-[pressed]:scale-[0.98]",
          glowing ? "duration-300" : "duration-500",
          "text-[oklch(0.3_0.045_55)]",
          glowing ? "dark:text-[oklch(0.25_0.05_50)]" : "dark:text-[oklch(0.92_0.02_85)]",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          s.box,
          cls,
        );
      })}
    >
      {composeRenderProps(children, (label, { isHovered, isPressed, isFocusVisible }) => {
        const glowing = lit || isHovered || isPressed || isFocusVisible;
        return (
          <>
            <style href="miyuki-lantern-button" precedence="miyuki">
              {keyframes}
            </style>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
              <span
                className={cn(
                  "absolute inset-x-0 overflow-clip",
                  "bg-[linear-gradient(90deg,oklch(0.88_0.024_78),oklch(0.955_0.014_84)_20%,oklch(0.972_0.01_88)_50%,oklch(0.955_0.014_84)_80%,oklch(0.88_0.024_78))]",
                  "dark:bg-[linear-gradient(90deg,oklch(0.25_0.02_58),oklch(0.32_0.022_66)_22%,oklch(0.345_0.022_70)_50%,oklch(0.32_0.022_66)_78%,oklch(0.25_0.02_58))]",
                  "transition-[box-shadow] ease-out",
                  glowing
                    ? "shadow-[inset_0_0_0_1px_oklch(0.6_0.12_60/0.3),0_0_18px_-2px_color-mix(in_oklab,var(--miyuki-lantern-button-light)_65%,transparent),0_6px_22px_-8px_color-mix(in_oklab,var(--miyuki-lantern-button-light)_70%,oklch(0.6_0.16_45))] duration-300 dark:shadow-[inset_0_0_0_1px_oklch(0.75_0.12_70/0.3),0_0_26px_0_color-mix(in_oklab,var(--miyuki-lantern-button-light)_45%,transparent),0_0_64px_8px_color-mix(in_oklab,var(--miyuki-lantern-button-light)_16%,transparent)]"
                    : "shadow-[inset_0_0_0_1px_oklch(0.45_0.04_60/0.16),0_1px_2px_oklch(0.3_0.04_55/0.14),0_4px_10px_-6px_oklch(0.3_0.04_55/0.3)] duration-500 dark:shadow-[inset_0_0_0_1px_oklch(0.6_0.03_70/0.12),0_1px_2px_oklch(0_0_0/0.4)]",
                  s.paper,
                )}
              >
                <span
                  className="absolute inset-0 opacity-60 mix-blend-multiply dark:opacity-40"
                  style={{ backgroundImage: FIBRE, backgroundSize: "160px 64px" }}
                />
                <span className="absolute inset-0 bg-[linear-gradient(transparent_31%,oklch(0.42_0.05_55/0.16)_31%,oklch(0.42_0.05_55/0.16)_calc(31%+1px),transparent_calc(31%+1px),transparent_68%,oklch(0.42_0.05_55/0.16)_68%,oklch(0.42_0.05_55/0.16)_calc(68%+1px),transparent_calc(68%+1px))] [mask-image:linear-gradient(90deg,#000,#000_14%,transparent_32%,transparent_68%,#000_86%,#000)] dark:bg-[linear-gradient(transparent_31%,oklch(0.15_0.02_55/0.4)_31%,oklch(0.15_0.02_55/0.4)_calc(31%+1px),transparent_calc(31%+1px),transparent_68%,oklch(0.15_0.02_55/0.4)_68%,oklch(0.15_0.02_55/0.4)_calc(68%+1px),transparent_calc(68%+1px))]" />
                <span
                  className={cn(
                    "absolute inset-0 transition-opacity ease-out",
                    glowing ? "opacity-100 duration-300" : "opacity-0 duration-500",
                  )}
                >
                  <span className="absolute inset-0 animate-[miyuki-lantern-button-breathe_3.9s_ease-in-out_infinite] motion-reduce:animate-none">
                    <span className="absolute inset-0 bg-[radial-gradient(ellipse_62%_80%_at_50%_56%,color-mix(in_oklab,var(--miyuki-lantern-button-light)_35%,oklch(0.995_0.02_95))_0%,color-mix(in_oklab,var(--miyuki-lantern-button-light)_88%,oklch(0.9_0.11_85))_42%,color-mix(in_oklab,var(--miyuki-lantern-button-light)_55%,oklch(0.56_0.16_45))_100%)]" />
                    <span className="absolute inset-0 bg-[linear-gradient(transparent_31%,oklch(0.38_0.1_45/0.3)_31%,oklch(0.38_0.1_45/0.3)_calc(31%+1px),transparent_calc(31%+1px),transparent_68%,oklch(0.38_0.1_45/0.3)_68%,oklch(0.38_0.1_45/0.3)_calc(68%+1px),transparent_calc(68%+1px))] [mask-image:linear-gradient(90deg,#000,#000_10%,transparent_30%,transparent_70%,#000_90%,#000)]" />
                    <span className="absolute inset-0 animate-[miyuki-lantern-button-sway_5.3s_ease-in-out_infinite] motion-reduce:animate-none">
                      <span className="absolute inset-0 animate-[miyuki-lantern-button-flicker_2.7s_linear_infinite] bg-[radial-gradient(ellipse_30%_58%_at_50%_60%,oklch(1_0.03_95/0.85),oklch(0.97_0.07_92/0.35)_55%,transparent_100%)] motion-reduce:animate-none" />
                    </span>
                  </span>
                  <span
                    className="absolute inset-0 mix-blend-multiply opacity-40"
                    style={{ backgroundImage: FIBRE, backgroundSize: "160px 64px" }}
                  />
                </span>
                <span
                  className={cn(
                    "absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_55%,oklch(1_0.04_95/0.75),transparent_75%)] transition-opacity",
                    isPressed ? "opacity-100 duration-75" : "opacity-0 duration-500 ease-out",
                  )}
                />
              </span>
              <span className={cn(wood, "top-0", s.rim)} />
              <span className={cn(wood, "bottom-0", s.rim)} />
            </span>
            {iconStart}
            {label != null && label !== false ? (
              <span
                className={cn(
                  "relative truncate transition-[text-shadow] duration-300",
                  glowing && "[text-shadow:0_0_6px_oklch(1_0.04_95/0.6)]",
                )}
              >
                {label}
              </span>
            ) : null}
            {iconEnd}
          </>
        );
      })}
    </AriaButton>
  );
}

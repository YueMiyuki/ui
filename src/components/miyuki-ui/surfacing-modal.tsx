"use client";

import type { ComponentProps, ReactNode, Ref } from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  composeRenderProps,
  DialogTrigger,
  type DialogTriggerProps,
} from "react-aria-components";
import { type ButtonSize, type ButtonVariant, buttonStyles } from "@/components/miyuki-ui/button";
import { Modal, ModalFooter, type ModalProps } from "@/components/miyuki-ui/modal";
import { cn } from "@/lib/utils";

const keyframes = `
@keyframes miyuki-surfacing-modal-scrim-in { from { opacity: 0; backdrop-filter: blur(0); } }
@keyframes miyuki-surfacing-modal-scrim-out { to { opacity: 0; backdrop-filter: blur(0); } }
@keyframes miyuki-surfacing-modal-surface {
  from { opacity: 0; transform: perspective(1200px) translateY(64px) rotateX(18deg) scale(0.96); filter: blur(8px); }
  55% { opacity: 1; filter: blur(0); }
}
@keyframes miyuki-surfacing-modal-sink {
  to { opacity: 0; transform: perspective(1200px) translateY(36px) rotateX(12deg) scale(0.97); filter: blur(4px); }
}
`;

export type SurfacingModalProps = DialogTriggerProps;

export function SurfacingModal(props: SurfacingModalProps) {
  return <DialogTrigger {...props} />;
}

export interface SurfacingModalTriggerProps extends Omit<AriaButtonProps, "children"> {
  icon: ReactNode;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

export function SurfacingModalTrigger({
  icon,
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: SurfacingModalTriggerProps) {
  const swapped = "group-data-[hovered]/swap:translate-x-0 group-data-[focus-visible]/swap:translate-x-0";
  return (
    <AriaButton
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(buttonStyles({ variant, size }), "group/swap overflow-clip", cls),
      )}
    >
      <span
        className={cn(
          "inline-block transition-transform duration-300 ease-settle motion-reduce:transition-none",
          "group-data-[hovered]/swap:translate-x-[calc(100%+1.25rem)] group-data-[focus-visible]/swap:translate-x-[calc(100%+1.25rem)]",
          "motion-reduce:translate-x-0!",
        )}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 grid -translate-x-full place-items-center transition-transform duration-300 ease-settle",
          "motion-reduce:hidden",
          swapped,
        )}
      >
        {icon}
      </span>
    </AriaButton>
  );
}

export type SurfacingModalBodyProps = ModalProps;

export function SurfacingModalBody({ className, overlayClassName, ...props }: SurfacingModalBodyProps) {
  return (
    <>
      <style href="miyuki-surfacing-modal" precedence="miyuki">
        {keyframes}
      </style>
      <Modal
        {...props}
        overlayClassName={cn(
          "backdrop-blur-[5px] dark:backdrop-blur-[5px]",
          "data-[entering]:animate-[miyuki-surfacing-modal-scrim-in_320ms_ease-out]",
          "data-[exiting]:animate-[miyuki-surfacing-modal-scrim-out_180ms_ease-in_forwards]",
          overlayClassName,
        )}
        className={cn(
          "origin-[50%_100%] will-change-transform",
          "data-[entering]:animate-[miyuki-surfacing-modal-surface_380ms_cubic-bezier(0.16,1,0.3,1)]",
          "data-[exiting]:animate-[miyuki-surfacing-modal-sink_180ms_cubic-bezier(0.4,0,1,1)_forwards]",
          className,
        )}
      />
    </>
  );
}

export type SurfacingModalContentProps = ComponentProps<"div">;

export function SurfacingModalContent({ className, ...props }: SurfacingModalContentProps) {
  return (
    <div
      {...props}
      className={cn(
        "flex min-h-0 flex-auto flex-col gap-5 overflow-y-auto overscroll-contain px-6 pt-6 pb-2 text-sm leading-6 text-foreground",
        className,
      )}
    />
  );
}

export type SurfacingModalFooterProps = ComponentProps<"div">;

export function SurfacingModalFooter({ className, ...props }: SurfacingModalFooterProps) {
  return <ModalFooter {...props} className={cn("pt-5", className)} />;
}

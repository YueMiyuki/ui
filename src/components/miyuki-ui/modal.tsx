"use client";

import { CircleHelp, TriangleAlert } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Modal as AriaModal,
  Dialog,
  type DialogRenderProps,
  DialogTrigger,
  type DialogTriggerProps,
  Heading,
  type HeadingProps,
  ModalOverlay,
  type ModalOverlayProps,
  Text,
  type TextProps,
} from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { CloseButton } from "@/components/miyuki-ui/close-button";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "full";

const keyframes = `
@keyframes miyuki-modal-fade-in { from { opacity: 0; } }
@keyframes miyuki-modal-fade-out { to { opacity: 0; } }
@keyframes miyuki-modal-rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
@keyframes miyuki-modal-sink { to { opacity: 0; transform: scale(0.985); } }
`;

const sizes: Record<ModalSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[520px]",
  lg: "max-w-[720px]",
  full: "h-full max-w-none",
};

const ModalContext = createContext<{ closeButton: boolean }>({ closeButton: false });

export function ModalTrigger(props: DialogTriggerProps) {
  return <DialogTrigger {...props} />;
}

export interface ModalProps extends Omit<ModalOverlayProps, "children" | "className" | "style" | "render"> {
  size?: ModalSize;
  isDismissable?: boolean;
  closeButton?: boolean;
  role?: "dialog" | "alertdialog";
  "aria-label"?: string;
  className?: string;
  overlayClassName?: string;
  backdropBlur?: boolean;
  children?: ReactNode | ((opts: DialogRenderProps) => ReactNode);
  ref?: Ref<HTMLDivElement>;
}

export function Modal({
  size = "md",
  isDismissable = true,
  closeButton = true,
  role,
  "aria-label": ariaLabel,
  className,
  overlayClassName,
  backdropBlur = false,
  children,
  ref,
  ...props
}: ModalProps) {
  return (
    <>
      <style href="miyuki-modal" precedence="miyuki">
        {keyframes}
      </style>
      <ModalOverlay
        {...props}
        isDismissable={isDismissable}
        className={cn(
          "fixed top-0 left-0 z-50 flex h-(--visual-viewport-height) w-full items-center justify-center",
          size === "full" ? "p-6" : "p-4 sm:p-6",
          "bg-foreground/25 dark:bg-background/60",
          backdropBlur && "backdrop-blur-sm",
          "data-[entering]:animate-[miyuki-modal-fade-in_200ms_ease-out]",
          "data-[exiting]:animate-[miyuki-modal-fade-out_120ms_ease-in_forwards]",
          overlayClassName,
        )}
      >
        <AriaModal
          ref={ref}
          className={cn(
            "relative flex max-h-full w-full flex-col rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl outline-none",
            "data-[entering]:animate-[miyuki-modal-rise_240ms_cubic-bezier(0.22,1,0.36,1)]",
            "data-[exiting]:animate-[miyuki-modal-sink_120ms_ease-in_forwards]",
            "motion-reduce:data-[entering]:animate-[miyuki-modal-fade-in_120ms_ease-out]",
            "motion-reduce:data-[exiting]:animate-[miyuki-modal-fade-out_100ms_ease-in_forwards]",
            sizes[size],
            className,
          )}
        >
          <Dialog
            role={role}
            aria-label={ariaLabel}
            render={(domProps) => <section {...domProps} role={domProps.role ?? "dialog"} aria-modal="true" />}
            className="relative flex min-h-0 flex-auto flex-col outline-none"
          >
            {(renderProps) => (
              <ModalContext value={{ closeButton }}>
                {typeof children === "function" ? children(renderProps) : children}
                {closeButton && <CloseButton slot="close" size="lg" className="absolute top-[22px] right-4" />}
              </ModalContext>
            )}
          </Dialog>
        </AriaModal>
      </ModalOverlay>
    </>
  );
}

export type ModalHeaderProps = ComponentProps<"div">;

export function ModalHeader({ className, ...props }: ModalHeaderProps) {
  return <div {...props} className={cn("flex shrink-0 flex-col gap-1.5 px-6 pt-6 pb-4", className)} />;
}

export type ModalTitleProps = HeadingProps;

export function ModalTitle({ className, ...props }: ModalTitleProps) {
  const { closeButton } = useContext(ModalContext);
  return (
    <Heading
      slot="title"
      {...props}
      className={cn(
        "text-lg leading-7 font-semibold tracking-[-0.01em] text-balance text-foreground",
        closeButton && "pe-8",
        className,
      )}
    />
  );
}

export type ModalDescriptionProps = TextProps;

export function ModalDescription({ className, ...props }: ModalDescriptionProps) {
  return (
    <Text
      slot="description"
      elementType="p"
      {...props}
      className={cn("text-sm leading-[22px] text-pretty text-muted-foreground", className)}
    />
  );
}

export type ModalBodyProps = ComponentProps<"div">;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as RefObject<T | null>).current = value;
}

export function ModalBody({ className, ref, ...props }: ModalBodyProps) {
  const inner = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      inner.current = el;
      assignRef(ref, el);
    },
    [ref],
  );

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const update = () => {
      const rest = el.scrollHeight - el.clientHeight - el.scrollTop;
      el.toggleAttribute("data-overflow-top", el.scrollTop > 0.5);
      el.toggleAttribute("data-overflow-bottom", rest > 0.5);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={setRefs}
      {...props}
      className={cn(
        "min-h-0 flex-auto overflow-y-auto overscroll-contain border-y border-transparent px-6 py-2 text-sm leading-6 text-foreground",
        "transition-[border-color] duration-150 ease-out",
        "data-[overflow-top]:border-t-border data-[overflow-bottom]:border-b-border",
        className,
      )}
    />
  );
}

export type ModalFooterProps = ComponentProps<"div">;

export function ModalFooter({ className, ...props }: ModalFooterProps) {
  return (
    <div
      {...props}
      className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2 px-6 pt-4 pb-6", className)}
    />
  );
}

export interface AlertDialogProps extends Omit<ModalProps, "children" | "role" | "closeButton" | "size"> {
  title: ReactNode;
  children?: ReactNode;
  actionLabel: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "default" | "destructive";
  icon?: ReactNode;
  onAction?: () => void | Promise<void>;
  size?: Exclude<ModalSize, "full">;
}

export function AlertDialog({
  title,
  children,
  actionLabel,
  cancelLabel = "Cancel",
  tone = "default",
  icon,
  onAction,
  size = "sm",
  isDismissable = false,
  ...props
}: AlertDialogProps) {
  const [pending, setPending] = useState(false);
  const destructive = tone === "destructive";
  const glyph = icon === undefined ? destructive ? <TriangleAlert /> : <CircleHelp /> : icon;

  return (
    <Modal {...props} size={size} role="alertdialog" closeButton={false} isDismissable={isDismissable}>
      {({ close }) => (
        <>
          <div className="flex items-start gap-4 px-6 pt-6 pb-2">
            {glyph != null && (
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
                  destructive ? "bg-destructive-soft text-destructive-strong" : "bg-brand-soft text-brand-strong",
                )}
              >
                {glyph}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1.5 pt-1.5">
              <ModalTitle className="text-base leading-6">{title}</ModalTitle>
              {children != null && <ModalDescription>{children}</ModalDescription>}
            </div>
          </div>
          <ModalFooter className="pt-5">
            <Button variant="secondary" slot="close" autoFocus isDisabled={pending}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? "destructive" : "primary"}
              isPending={pending}
              onPress={async () => {
                const result = onAction?.();
                if (result instanceof Promise) {
                  setPending(true);
                  try {
                    await result;
                  } finally {
                    setPending(false);
                  }
                }
                close();
              }}
            >
              {actionLabel}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

"use client";

import { X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, type Transition, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactNode, useId, useRef, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { cn } from "@/lib/utils";

export interface OpeningRowsItem {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  content: ReactNode;
  action?: ReactNode;
}

export interface OpeningRowsProps extends Omit<ComponentProps<"div">, "children"> {
  items: OpeningRowsItem[];
  layout?: "list" | "grid";
  viewLabel?: string;
  closeLabel?: string;
  backdropBlur?: boolean;
}

const SETTLE: Transition = { type: "spring", stiffness: 420, damping: 34 };
const MORPH: Transition = { type: "spring", stiffness: 380, damping: 36, mass: 0.9 };

const MotionModal = motion.create(Modal);

export function OpeningRows({
  items,
  layout = "list",
  viewLabel = "View",
  closeLabel = "Close",
  backdropBlur = false,
  className,
  ...props
}: OpeningRowsProps) {
  const group = useId();
  const titleId = useId();
  const reduced = useReducedMotion() ?? false;
  const [openId, setOpenId] = useState<string | null>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const lastId = useRef<string | null>(null);
  const active = items.find((item) => item.id === openId) ?? null;

  const lid = (part: string, id: string) => (reduced ? undefined : `${part}-${id}`);

  function open(id: string) {
    lastId.current = id;
    setOpenId(id);
  }

  const grid = layout === "grid";

  return (
    <div {...props} className={cn("@container", className)}>
      <LayoutGroup id={group}>
        <ul className={cn(grid ? "grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-3" : "flex flex-col gap-2")}>
          {items.map((item) => (
            <li key={item.id}>
              <motion.div
                layoutId={lid("card", item.id)}
                transition={MORPH}
                style={{ borderRadius: 18 }}
                onClick={() => open(item.id)}
                className={cn(
                  "relative border border-border bg-card text-card-foreground shadow-xs transition-shadow duration-200 ease-settle hover:shadow-sm",
                  grid ? "flex flex-col p-2.5" : "flex items-center gap-4 p-2.5 pr-3.5",
                )}
              >
                <motion.img
                  layoutId={lid("image", item.id)}
                  transition={MORPH}
                  src={item.src}
                  alt=""
                  draggable={false}
                  style={{ borderRadius: 8 }}
                  className={cn("shrink-0 object-cover", grid ? "aspect-[4/3] w-full" : "size-14")}
                />
                <div className={cn("flex min-w-0 flex-1 items-center gap-3", grid && "px-1.5 pt-3 pb-1")}>
                  <div className="min-w-0 flex-1">
                    <motion.h3
                      layoutId={lid("title", item.id)}
                      transition={MORPH}
                      className="w-fit max-w-full truncate text-sm font-semibold"
                    >
                      {item.title}
                    </motion.h3>
                    <motion.p
                      layoutId={lid("subtitle", item.id)}
                      transition={MORPH}
                      className="mt-0.5 w-fit max-w-full truncate text-[13px] text-muted-foreground"
                    >
                      {item.subtitle}
                    </motion.p>
                  </div>
                  <motion.div
                    className="shrink-0"
                    initial={false}
                    animate={{ opacity: !reduced && openId === item.id ? 0 : 1 }}
                    transition={openId === item.id ? { duration: 0 } : { duration: 0.2, delay: 0.22 }}
                  >
                    <Button
                      ref={(node: HTMLButtonElement | null) => {
                        if (node) triggers.current.set(item.id, node);
                        else triggers.current.delete(item.id);
                      }}
                      variant="secondary"
                      size="sm"
                      aria-label={`${viewLabel} ${item.title}`}
                      onPress={() => open(item.id)}
                    >
                      {viewLabel}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </li>
          ))}
        </ul>

        <AnimatePresence
          onExitComplete={() => {
            const id = lastId.current;
            if (id) triggers.current.get(id)?.focus({ preventScroll: true });
          }}
        >
          {active ? (
            <ModalOverlay
              key={active.id}
              isOpen
              isDismissable
              onOpenChange={(isOpen) => {
                if (!isOpen) setOpenId(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            >
              <motion.div
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 bg-foreground/25 dark:bg-background/65",
                  backdropBlur && "backdrop-blur-sm",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.18 } }}
              />
              <MotionModal
                layoutId={lid("card", active.id)}
                transition={MORPH}
                style={{ borderRadius: 18 }}
                {...(reduced
                  ? {
                      initial: { opacity: 0 },
                      animate: { opacity: 1, transition: { duration: 0.18 } },
                      exit: { opacity: 0, transition: { duration: 0.12 } },
                    }
                  : {})}
                className="relative w-full max-w-lg overflow-hidden border border-border bg-popover text-popover-foreground shadow-xl outline-none"
              >
                <Dialog
                  aria-labelledby={titleId}
                  render={(domProps) => <section {...domProps} role="dialog" aria-modal="true" />}
                  className="max-h-[calc(100dvh-2rem)] overflow-y-auto outline-none sm:max-h-[calc(100dvh-3rem)]"
                >
                  {({ close }) => (
                    <>
                      <div className="relative">
                        <motion.img
                          layoutId={lid("image", active.id)}
                          transition={MORPH}
                          src={active.src}
                          alt=""
                          draggable={false}
                          style={{ borderRadius: 0 }}
                          className="aspect-[2/1] w-full object-cover"
                        />
                        <motion.div
                          layout={!reduced}
                          transition={MORPH}
                          className="absolute top-3 right-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { duration: 0.2, delay: 0.12 } }}
                          exit={{ opacity: 0, transition: { duration: 0.08 } }}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={closeLabel}
                            iconStart={<X />}
                            onPress={close}
                            className="rounded-full border-transparent bg-popover/92 data-[focus-visible]:ring-brand"
                          />
                        </motion.div>
                      </div>
                      <div className="p-6">
                        <motion.h2
                          id={titleId}
                          layoutId={lid("title", active.id)}
                          transition={MORPH}
                          className="w-fit text-xl font-semibold tracking-[-0.01em]"
                        >
                          {active.title}
                        </motion.h2>
                        <motion.p
                          layoutId={lid("subtitle", active.id)}
                          transition={MORPH}
                          className="mt-0.5 w-fit text-sm text-muted-foreground"
                        >
                          {active.subtitle}
                        </motion.p>
                        <motion.div
                          layout={!reduced}
                          transition={MORPH}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { ...SETTLE, opacity: { duration: 0.22, delay: 0.1 } } }}
                          exit={{ opacity: 0, transition: { duration: 0.08 } }}
                        >
                          <div className="mt-5">{active.content}</div>
                          {active.action ? <div className="mt-6 flex justify-end gap-2">{active.action}</div> : null}
                        </motion.div>
                      </div>
                    </>
                  )}
                </Dialog>
              </MotionModal>
            </ModalOverlay>
          ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}

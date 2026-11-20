"use client";

import { type ClipboardEvent, type MouseEvent, type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import {
  Button as AriaButton,
  Input as AriaInput,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  composeRenderProps,
  Group,
  Label,
  Text,
} from "react-aria-components";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { MorphIcon, morphIcons } from "@/components/miyuki-ui/path-morph";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

export type CopyFieldSize = "sm" | "md" | "lg";

const heights: Record<CopyFieldSize, string> = { sm: "h-8", md: "h-9", lg: "h-11" };
const padStart: Record<CopyFieldSize, string> = { sm: "ps-2.5", md: "ps-3", lg: "ps-3.5" };
const padEnd: Record<CopyFieldSize, string> = { sm: "pe-2.5", md: "pe-3", lg: "pe-3.5" };
const square: Record<CopyFieldSize, string> = { sm: "size-6", md: "size-7", lg: "size-9" };
const edge: Record<CopyFieldSize, string> = { sm: "me-1", md: "me-1", lg: "me-1.5" };

const DOTS = "\u2022".repeat(8);

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const previous = document.activeElement as HTMLElement | null;
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    previous?.focus({ preventScroll: true });
    return ok;
  }
}

function copyShortcut() {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform) ? "\u2318C" : "Ctrl+C";
}

interface Status {
  open: boolean;
  copied: boolean;
  text: string;
}

export interface CopyFieldProps
  extends Omit<
    AriaTextFieldProps,
    "children" | "value" | "defaultValue" | "onChange" | "isReadOnly" | "onCopy" | "type" | "isInvalid" | "validate"
  > {
  value: string;
  label?: ReactNode;
  description?: ReactNode;
  size?: CopyFieldSize;
  masked?: boolean;
  prefix?: ReactNode;
  onCopy?: (value: string) => void;
  copyLabel?: string;
  fieldClassName?: string;
  ref?: Ref<HTMLDivElement>;
}

export function CopyField({
  value,
  label,
  description,
  size = "md",
  masked = false,
  prefix,
  onCopy,
  copyLabel = "Copy",
  isDisabled,
  className,
  fieldClassName,
  ...props
}: CopyFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<Status>({ open: false, copied: false, text: "Copied" });
  const [revealed, setRevealed] = useState(false);
  const entering = useRef(false);
  const hidden = masked && !revealed;
  const shown = hidden ? (value.length > 4 ? DOTS + value.slice(-4) : DOTS) : value;

  useEffect(() => () => clearTimeout(timer.current), []);

  function settle(copied: boolean, text: string, ms: number) {
    clearTimeout(timer.current);
    setStatus({ open: true, copied, text });
    timer.current = setTimeout(() => setStatus((s) => ({ ...s, open: false, copied: false })), ms);
  }

  async function copy() {
    if (await writeClipboard(value)) {
      settle(true, "Copied", 1600);
      onCopy?.(value);
      return;
    }
    settle(false, `Press ${copyShortcut()} to copy`, 4000);
    const input = inputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      input.select();
    }
  }

  function copyReal(event: ClipboardEvent<HTMLInputElement>) {
    if (!hidden) return;
    event.preventDefault();
    event.clipboardData.setData("text/plain", value);
  }

  function selectAll(event: MouseEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const fresh = entering.current;
    entering.current = false;
    if (!fresh && input.selectionStart !== input.selectionEnd) return;
    event.preventDefault();
    input.select();
  }

  function focusInput(event: MouseEvent) {
    if (event.target === inputRef.current || (event.target as Element).closest("button")) return;
    event.preventDefault();
    inputRef.current?.focus();
  }

  return (
    <AriaTextField
      {...props}
      value={shown}
      isReadOnly
      isDisabled={isDisabled}
      className={composeRenderProps(className, (cls) =>
        cn("group/field flex flex-col gap-1.5 data-[disabled]:opacity-50", cls),
      )}
    >
      {label != null && <Label className="w-fit text-sm font-medium text-foreground">{label}</Label>}
      <Group
        isReadOnly
        onMouseDown={focusInput}
        className={({ isFocusWithin }) =>
          cn(
            "flex w-full items-center overflow-hidden rounded-lg border bg-muted text-foreground shadow-none outline-none",
            "transition-[border-color,box-shadow] duration-150 ease-settle",
            "data-[disabled]:cursor-not-allowed",
            isFocusWithin ? "border-brand ring-[3px] ring-ring" : "border-input",
            heights[size],
            fieldClassName,
          )
        }
      >
        {prefix != null && (
          <span
            className={cn(
              "flex h-full shrink-0 items-center border-e border-input font-mono text-[13px] text-muted-foreground select-none",
              padStart[size],
              padEnd[size],
            )}
          >
            {prefix}
          </span>
        )}
        <AriaInput
          ref={inputRef}
          spellCheck={false}
          onFocus={(event) => event.currentTarget.select()}
          onMouseDown={(event) => {
            entering.current = document.activeElement !== event.currentTarget;
          }}
          onMouseUp={selectAll}
          onCopy={copyReal}
          onCut={copyReal}
          className={cn(
            "h-full w-full min-w-0 flex-1 cursor-text bg-transparent pe-1 font-mono text-[13px] text-ellipsis text-foreground outline-none",
            "selection:bg-brand/25 data-[disabled]:cursor-not-allowed",
            hidden && "tracking-[0.04em]",
            prefix != null ? "ps-2.5" : padStart[size],
          )}
        />
        {masked && (
          <AriaButton
            aria-label={revealed ? "Hide value" : "Show value"}
            isDisabled={isDisabled}
            onPress={() => setRevealed((v) => !v)}
            className={cn(
              "flex shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none",
              "transition-[background-color,color] duration-150 ease-settle",
              "data-[hovered]:bg-accent data-[hovered]:text-foreground data-[pressed]:text-foreground",
              "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
              "data-[disabled]:pointer-events-none",
              square[size],
            )}
          >
            <MorphIcon shapes={morphIcons.eyeOpenClosed} shape={revealed ? "open" : "closed"} size={16} />
          </AriaButton>
        )}
        <TooltipTrigger isOpen={status.open} onOpenChange={() => {}}>
          <IconButton
            variant="ghost"
            aria-label={copyLabel}
            isDisabled={isDisabled}
            onPress={copy}
            className={cn(
              "rounded-md text-muted-foreground data-[hovered]:text-foreground",
              status.copied && "text-brand data-[hovered]:text-brand",
              square[size],
              edge[size],
            )}
          >
            <MorphIcon shapes={morphIcons.copyCheck} shape={status.copied ? "check" : "copy"} size={16} />
          </IconButton>
          <Tooltip placement="top">{status.text}</Tooltip>
        </TooltipTrigger>
      </Group>
      <span role="status" className="sr-only">
        {status.open ? status.text : ""}
      </span>
      {description != null && (
        <Text slot="description" className="text-[13px] leading-5 text-muted-foreground">
          {description}
        </Text>
      )}
    </AriaTextField>
  );
}

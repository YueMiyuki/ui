"use client";

import { ChevronDown, Plus } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  composeRenderProps,
  FileTrigger,
} from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import { Dropdown, DropdownItem, DropdownMenu } from "@/components/miyuki-ui/dropdown";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { MorphIcon, type MorphShapes } from "@/components/miyuki-ui/path-morph";
import { Tooltip, TooltipTrigger } from "@/components/miyuki-ui/tooltip";
import { cn } from "@/lib/utils";

export type PromptBoxStatus = "idle" | "streaming";

export interface PromptBoxModel {
  id: string;
  name: string;
  description?: ReactNode;
}

export interface PromptBoxContextItem {
  id?: string;
  label: ReactNode;
  icon?: ReactNode;
}

const sendStop: MorphShapes = {
  send: "M6.5 11L12 5.5L17.5 11L12 5.5L12 18.5L12 5.5Z",
  stop: "M7.5 7.5L12 7.5L16.5 7.5L16.5 16.5L12 16.5L7.5 16.5Z",
};

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function fadeEdges(el: HTMLTextAreaElement) {
  const max = el.scrollHeight - el.clientHeight;
  el.style.setProperty("--miyuki-prompt-box-fade-top", el.scrollTop > 1 ? "16px" : "0px");
  el.style.setProperty("--miyuki-prompt-box-fade-bottom", max > 1 && el.scrollTop < max - 1 ? "16px" : "0px");
}

export interface PromptBoxTextAreaProps extends Omit<AriaTextFieldProps, "children" | "className"> {
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  onSubmit?: () => void;
  className?: string;
  textAreaClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function PromptBoxTextArea({
  placeholder = "Ask anything",
  minRows = 1,
  maxRows = 8,
  onSubmit,
  className,
  textAreaClassName,
  value,
  ref,
  "aria-label": ariaLabel = "Message",
  ...props
}: PromptBoxTextAreaProps) {
  const area = useRef<HTMLTextAreaElement | null>(null);
  const shell = useRef<HTMLDivElement>(null);

  const setArea = useCallback(
    (el: HTMLTextAreaElement | null) => {
      area.current = el;
      assignRef(ref, el);
    },
    [ref],
  );

  const fit = useCallback(() => {
    const el = area.current;
    const box = shell.current;
    if (!el || !box) return;
    const style = getComputedStyle(el);
    const line = parseFloat(style.lineHeight) || 24;
    const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const min = minRows * line + chrome;
    const max = maxRows * line + chrome;
    if (!box.style.height) box.style.height = `${box.offsetHeight}px`;
    const scroll = el.scrollTop;
    el.style.height = "0px";
    const content = el.scrollHeight;
    const next = Math.min(Math.max(content, min), max);
    el.style.height = `${next}px`;
    el.style.overflowY = content > max + 1 ? "auto" : "hidden";
    el.scrollTop = scroll;
    box.style.height = `${next}px`;
    fadeEdges(el);
  }, [minRows, maxRows]);

  useLayoutEffect(fit, [fit, value]);

  useLayoutEffect(() => {
    const box = shell.current;
    if (!box) return;
    const frame = requestAnimationFrame(() => box.setAttribute("data-ready", ""));
    let width = box.clientWidth;
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === width) return;
      width = box.clientWidth;
      fit();
    });
    observer.observe(box);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [fit]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.altKey) return;
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <AriaTextField {...props} value={value} aria-label={ariaLabel} className="flex flex-col">
      <div
        ref={shell}
        className={cn(
          "overflow-clip data-[ready]:transition-[height] data-[ready]:duration-150 data-[ready]:ease-settle motion-reduce:transition-none",
          className,
        )}
      >
        <AriaTextArea
          ref={setArea}
          rows={minRows}
          placeholder={placeholder}
          onInput={fit}
          onScroll={(event) => fadeEdges(event.currentTarget)}
          onKeyDown={onKeyDown}
          className={cn(
            "block w-full resize-none overflow-y-hidden bg-transparent px-4 py-3 text-base leading-6 text-foreground outline-none",
            "placeholder:text-muted-foreground data-[disabled]:cursor-not-allowed",
            "[scrollbar-width:thin] [overflow-wrap:anywhere]",
            "[mask-image:linear-gradient(to_bottom,transparent,#000_var(--miyuki-prompt-box-fade-top,0px),#000_calc(100%-var(--miyuki-prompt-box-fade-bottom,0px)),transparent)]",
            textAreaClassName,
          )}
        />
      </div>
    </AriaTextField>
  );
}

export interface PromptBoxSendButtonProps extends Omit<AriaButtonProps, "children" | "onPress"> {
  status?: PromptBoxStatus;
  onSend?: () => void;
  onStop?: () => void;
  ref?: Ref<HTMLButtonElement>;
}

export function PromptBoxSendButton({
  status = "idle",
  onSend,
  onStop,
  isDisabled,
  className,
  ...props
}: PromptBoxSendButtonProps) {
  const streaming = status === "streaming";
  return (
    <AriaButton
      {...props}
      aria-label={streaming ? "Stop" : "Send message"}
      isDisabled={streaming ? false : isDisabled}
      onPress={streaming ? onStop : onSend}
      className={composeRenderProps(className, (cls) =>
        cn(
          "inline-grid size-8 shrink-0 cursor-default place-items-center rounded-full bg-primary text-primary-foreground shadow-xs outline-none select-none",
          "transition-[transform,background-color,opacity] duration-150 ease-settle",
          "data-[hovered]:bg-primary/90 data-[pressed]:scale-[0.94]",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
          "data-[disabled]:opacity-35",
          cls,
        ),
      )}
    >
      <MorphIcon shapes={sendStop} shape={streaming ? "stop" : "send"} size={20} strokeWidth={2} filled />
    </AriaButton>
  );
}

export interface PromptBoxModelPickerProps {
  models: PromptBoxModel[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (id: string) => void;
  isDisabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function PromptBoxModelPicker({
  models,
  model,
  defaultModel,
  onModelChange,
  isDisabled,
  className,
  "aria-label": ariaLabel = "Model",
}: PromptBoxModelPickerProps) {
  const [own, setOwn] = useState(defaultModel ?? models[0]?.id);
  const selected = model ?? own;
  const current = models.find((m) => m.id === selected) ?? models[0];
  if (!current) return null;

  return (
    <Dropdown>
      <Button
        variant="ghost"
        size="sm"
        isDisabled={isDisabled}
        aria-label={`${ariaLabel}: ${current.name}`}
        iconEnd={<ChevronDown aria-hidden="true" />}
        className={cn(
          "gap-1 rounded-full px-2.5 text-[13px] text-muted-foreground [&_svg]:size-3.5",
          "data-[hovered]:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
          className,
        )}
      >
        {current.name}
      </Button>
      <DropdownMenu
        aria-label={ariaLabel}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[current.id]}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          const id = [...keys][0];
          if (id == null) return;
          if (model === undefined) setOwn(String(id));
          onModelChange?.(String(id));
        }}
        placement="top start"
        popoverClassName="w-72"
      >
        {models.map((m) => (
          <DropdownItem key={m.id} id={m.id} textValue={m.name} description={m.description}>
            {m.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}

export interface PromptBoxAttachButtonProps {
  onAttach?: (files: File[]) => void;
  accept?: string[];
  label?: string;
  isDisabled?: boolean;
  className?: string;
}

export function PromptBoxAttachButton({
  onAttach,
  accept,
  label = "Add files",
  isDisabled,
  className,
}: PromptBoxAttachButtonProps) {
  return (
    <FileTrigger
      allowsMultiple
      acceptedFileTypes={accept}
      onSelect={(list) => {
        if (list && list.length > 0) onAttach?.(Array.from(list));
      }}
    >
      <TooltipTrigger delay={700}>
        <IconButton
          variant="secondary"
          size="sm"
          aria-label={label}
          isDisabled={isDisabled}
          className={cn(
            "rounded-full text-muted-foreground shadow-none data-[hovered]:text-foreground [&_svg]:size-[18px]",
            className,
          )}
        >
          <Plus strokeWidth={1.75} />
        </IconButton>
        <Tooltip>{label}</Tooltip>
      </TooltipTrigger>
    </FileTrigger>
  );
}

export interface PromptBoxContextRowProps extends Omit<ComponentProps<"ul">, "children"> {
  items: PromptBoxContextItem[];
}

export function PromptBoxContextRow({ items, className, ...props }: PromptBoxContextRowProps) {
  return (
    <ul aria-label="Context" {...props} className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}>
      {items.map((item, i) => (
        <li
          key={item.id ?? i}
          className={cn(
            "inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md bg-muted px-2 text-xs leading-4 text-muted-foreground dark:bg-muted/70",
            "[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-80",
          )}
        >
          {item.icon}
          <span className="truncate">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export interface PromptBoxProps extends Omit<ComponentProps<"div">, "onChange" | "children" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSend?: (value: string) => void;
  onStop?: () => void;
  status?: PromptBoxStatus;
  models?: PromptBoxModel[];
  model?: string;
  defaultModel?: string;
  onModelChange?: (id: string) => void;
  context?: PromptBoxContextItem[];
  placeholder?: string;
  onAttach?: (files: File[]) => void;
  accept?: string[];
  showAttach?: boolean;
  canSend?: boolean;
  maxRows?: number;
  isDisabled?: boolean;
  autoFocus?: boolean;
  children?: ReactNode;
}

export function usePromptBoxText(value: string | undefined, defaultValue: string, onChange?: (value: string) => void) {
  const [own, setOwn] = useState(defaultValue);
  const text = value ?? own;
  const setText = useCallback(
    (next: string) => {
      if (value === undefined) setOwn(next);
      onChange?.(next);
    },
    [value, onChange],
  );
  return [text, setText] as const;
}

export function focusPromptBoxOnBlankClick(event: MouseEvent<HTMLElement>) {
  const target = event.target as HTMLElement;
  if (target.closest("button, a, input, textarea, [role=button]")) return;
  const area = event.currentTarget.querySelector("textarea");
  if (!area) return;
  event.preventDefault();
  area.focus();
}

const promptBoxStyles = cn(
  "relative flex flex-col rounded-2xl border border-border bg-card shadow-sm",
  "transition-[border-color,box-shadow] duration-200 ease-settle",
  "hover:border-border-strong",
  "has-[textarea:focus]:border-brand/70 has-[textarea:focus]:ring-[3px] has-[textarea:focus]:ring-ring/60",
);

export function PromptBox({
  value,
  defaultValue = "",
  onChange,
  onSend,
  onStop,
  status = "idle",
  models,
  model,
  defaultModel,
  onModelChange,
  context,
  placeholder = "Ask anything",
  onAttach,
  accept,
  showAttach = true,
  canSend,
  maxRows = 8,
  isDisabled = false,
  autoFocus,
  className,
  children,
  ...props
}: PromptBoxProps) {
  const [text, setText] = usePromptBoxText(value, defaultValue, onChange);
  const area = useRef<HTMLTextAreaElement>(null);
  const streaming = status === "streaming";
  const sendable = !isDisabled && (canSend ?? text.trim().length > 0);

  const send = () => {
    if (streaming || !sendable) return;
    onSend?.(text);
    if (value === undefined) setText("");
    area.current?.focus();
  };

  return (
    <div {...props} className={cn("flex w-full flex-col gap-2", className)}>
      <div onMouseDown={focusPromptBoxOnBlankClick} className={cn(promptBoxStyles, isDisabled && "opacity-60")}>
        {children}
        <PromptBoxTextArea
          ref={area}
          value={text}
          onChange={setText}
          onSubmit={send}
          placeholder={placeholder}
          maxRows={maxRows}
          isDisabled={isDisabled}
          autoFocus={autoFocus}
        />
        <div className="flex items-center gap-1 px-3 pb-3">
          {showAttach && <PromptBoxAttachButton onAttach={onAttach} accept={accept} isDisabled={isDisabled} />}
          {models && models.length > 0 && (
            <PromptBoxModelPicker
              models={models}
              model={model}
              defaultModel={defaultModel}
              onModelChange={onModelChange}
              isDisabled={isDisabled}
            />
          )}
          <span className="flex-1" />
          <PromptBoxSendButton status={status} isDisabled={!sendable} onSend={send} onStop={onStop} />
        </div>
      </div>
      {context && context.length > 0 && <PromptBoxContextRow items={context} className="px-1.5" />}
    </div>
  );
}

"use client";

import { ChevronDown, ClipboardList, Hand, ShieldOff, Zap } from "lucide-react";
import { type ComponentProps, type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/miyuki-ui/button";
import { Dropdown, DropdownItem, DropdownMenu } from "@/components/miyuki-ui/dropdown";
import {
  focusPromptBoxOnBlankClick,
  PromptBoxAttachButton,
  type PromptBoxContextItem,
  type PromptBoxModel,
  PromptBoxModelPicker,
  PromptBoxSendButton,
  type PromptBoxStatus,
  PromptBoxTextArea,
  usePromptBoxText,
} from "@/components/miyuki-ui/prompt-box";
import { cn } from "@/lib/utils";

export type PromptModeTone = "default" | "warning";

export interface PromptMode {
  id: string;
  label: string;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: PromptModeTone;
}

export const promptModes: PromptMode[] = [
  { id: "ask", label: "Ask first", description: "Checks with you before every step.", icon: <Hand /> },
  { id: "auto", label: "Auto", description: "Asks only before booking or sending.", icon: <Zap /> },
  { id: "plan", label: "Plan", description: "Drafts a plan and changes nothing.", icon: <ClipboardList /> },
  {
    id: "bypass",
    label: "Bypass all",
    description: "Runs every step without asking.",
    icon: <ShieldOff />,
    tone: "warning",
  },
];

export interface PromptConsoleProps extends Omit<ComponentProps<"div">, "onChange" | "children" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSend?: (value: string) => void;
  onStop?: () => void;
  status?: PromptBoxStatus;
  modes?: PromptMode[];
  mode?: string;
  defaultMode?: string;
  onModeChange?: (id: string) => void;
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

function ModePicker({
  modes,
  mode,
  onModeChange,
  isDisabled,
}: {
  modes: PromptMode[];
  mode: string;
  onModeChange: (id: string) => void;
  isDisabled?: boolean;
}) {
  const current = modes.find((m) => m.id === mode) ?? modes[0];
  if (!current) return null;
  const warning = current.tone === "warning";

  return (
    <Dropdown>
      <Button
        variant="soft"
        size="sm"
        isDisabled={isDisabled}
        aria-label={`Mode: ${current.label}`}
        iconStart={current.icon}
        iconEnd={<ChevronDown aria-hidden="true" className="opacity-70" />}
        className={cn(
          "gap-1.5 rounded-full ps-2.5 pe-2 text-[13px] [&_svg]:size-3.5",
          warning ? "bg-warning-soft text-warning-strong data-[hovered]:bg-warning-soft/80" : "aria-expanded:bg-accent",
        )}
      >
        {current.label}
      </Button>
      <DropdownMenu
        aria-label="Permission mode"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[current.id]}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          const id = [...keys][0];
          if (id != null) onModeChange(String(id));
        }}
        placement="top start"
        popoverClassName="w-[19rem]"
      >
        {modes.map((m) => (
          <DropdownItem
            key={m.id}
            id={m.id}
            icon={m.icon}
            textValue={m.label}
            description={m.description}
            tone={m.tone === "warning" ? "warning" : "default"}
          >
            {m.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}

export function PromptConsole({
  value,
  defaultValue = "",
  onChange,
  onSend,
  onStop,
  status = "idle",
  modes = promptModes,
  mode,
  defaultMode,
  onModeChange,
  models,
  model,
  defaultModel,
  onModelChange,
  context,
  placeholder = "What do you need today?",
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
}: PromptConsoleProps) {
  const [text, setText] = usePromptBoxText(value, defaultValue, onChange);
  const [ownMode, setOwnMode] = useState(defaultMode ?? modes[0]?.id ?? "");
  const currentMode = mode ?? ownMode;
  const area = useRef<HTMLTextAreaElement>(null);
  const streaming = status === "streaming";
  const sendable = !isDisabled && (canSend ?? text.trim().length > 0);
  const hasContext = context != null && context.length > 0;

  const send = () => {
    if (streaming || !sendable) return;
    onSend?.(text);
    if (value === undefined) setText("");
    area.current?.focus();
  };

  return (
    <div {...props} className={cn("group/panel flex w-full flex-col", className)}>
      {hasContext && (
        <ul
          aria-label="Context"
          className={cn(
            "relative z-10 -mb-px flex max-w-[calc(100%-2.5rem)] min-w-0 items-center gap-3 self-start",
            "h-9 rounded-t-xl border border-b-0 border-border bg-card ps-3.5 pe-3.5 pt-px",
            "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-card",
            "transition-[border-color] duration-200 ease-settle group-has-[textarea:focus]/panel:border-brand/60",
            "text-xs leading-4 text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-80",
          )}
        >
          {context.map((item, i) => (
            <li key={item.id ?? i} className="inline-flex min-w-0 items-center gap-1.5">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
      <div
        onMouseDown={focusPromptBoxOnBlankClick}
        className={cn(
          "relative flex flex-col rounded-2xl border border-border bg-card shadow-sm",
          "transition-[border-color,box-shadow] duration-200 ease-settle",
          "has-[textarea:focus]:border-brand/60 has-[textarea:focus]:shadow-md",
          hasContext && "rounded-tl-none",
          isDisabled && "opacity-60",
        )}
      >
        {children}
        <PromptBoxTextArea
          ref={area}
          value={text}
          onChange={setText}
          onSubmit={send}
          placeholder={placeholder}
          maxRows={maxRows}
          minRows={2}
          isDisabled={isDisabled}
          autoFocus={autoFocus}
          textAreaClassName="pt-3.5"
        />
        <div className="flex items-center gap-1.5 px-3 pt-1 pb-3">
          {showAttach && <PromptBoxAttachButton onAttach={onAttach} accept={accept} isDisabled={isDisabled} />}
          {modes.length > 0 && (
            <ModePicker
              modes={modes}
              mode={currentMode}
              isDisabled={isDisabled}
              onModeChange={(id) => {
                if (mode === undefined) setOwnMode(id);
                onModeChange?.(id);
              }}
            />
          )}
          <span className="flex-1" />
          {models && models.length > 0 && (
            <PromptBoxModelPicker
              models={models}
              model={model}
              defaultModel={defaultModel}
              onModelChange={onModelChange}
              isDisabled={isDisabled}
            />
          )}
          <PromptBoxSendButton status={status} isDisabled={!sendable} onSend={send} onStop={onStop} />
        </div>
      </div>
    </div>
  );
}

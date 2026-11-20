"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, type Ref, type RefObject, useId, useLayoutEffect, useRef, useState } from "react";
import {
  ColorPicker as AriaColorPicker,
  Button,
  type Color,
  ColorArea,
  ColorField,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorThumb,
  Dialog,
  DialogTrigger,
  Input,
  Popover,
  SliderTrack,
} from "react-aria-components";
import { onThemeChange, toRgba } from "@/components/miyuki-ui/lib/color";
import { cn } from "@/lib/utils";

export const defaultColorPresets = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--success)",
  "var(--foreground)",
];

const checkerImage = "repeating-conic-gradient(var(--border-strong) 0% 25%, var(--card) 0% 50%)";
const checker = `${checkerImage} 50% / 8px 8px`;

function overChecker(css: string) {
  return {
    backgroundImage: `linear-gradient(${css}, ${css}), ${checkerImage}`,
    backgroundSize: "auto, 8px 8px",
    backgroundPosition: "center",
  };
}

function hexOf(value: string, scope: Element | null) {
  const [r, g, b] = toRgba(value, scope);
  return `#${[r, g, b]
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function usePresetColors(presets: readonly string[], scope: RefObject<HTMLElement | null>) {
  const [colors, setColors] = useState<string[] | null>(null);
  const key = presets.join("|");
  useLayoutEffect(() => {
    const list = key === "" ? [] : key.split("|");
    const resolve = () => setColors(Array.from(new Set(list.map((c) => hexOf(c, scope.current)))));
    resolve();
    return onThemeChange(resolve);
  }, [key, scope]);
  return colors;
}

const thumbStyles = cn(
  "size-5 rounded-full border-2 border-white shadow-md ring-1 ring-black/20",
  "transition-[scale,box-shadow] duration-150 ease-settle motion-reduce:transition-none",
  "data-[dragging]:scale-110 data-[focus-visible]:scale-110 data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring",
);

function PanelContents({ presets, showAlpha }: { presets: readonly string[]; showAlpha: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const colors = usePresetColors(presets, root);

  return (
    <div ref={root} className="flex w-60 max-w-full flex-col gap-3">
      <ColorArea
        colorSpace="hsb"
        xChannel="saturation"
        yChannel="brightness"
        className="relative h-[180px] w-full shrink-0 cursor-crosshair rounded-lg ring-1 ring-foreground/10 ring-inset data-[disabled]:cursor-not-allowed"
      >
        <ColorThumb className={thumbStyles} />
      </ColorArea>

      <ColorSlider colorSpace="hsb" channel="hue" className="py-1">
        <SliderTrack className="relative h-3 w-full rounded-full ring-1 ring-foreground/10 ring-inset">
          <ColorThumb className={cn(thumbStyles, "top-1/2")} />
        </SliderTrack>
      </ColorSlider>

      {showAlpha && (
        <ColorSlider colorSpace="hsb" channel="alpha" className="py-1">
          <SliderTrack
            className="relative h-3 w-full rounded-full ring-1 ring-foreground/10 ring-inset"
            style={({ defaultStyle }) => ({
              ...defaultStyle,
              background: `${defaultStyle.background}, ${checker}`,
            })}
          >
            <ColorThumb
              className={cn(thumbStyles, "top-1/2")}
              style={({ defaultStyle, color }) => ({
                ...defaultStyle,
                ...overChecker(color.toString("css")),
              })}
            />
          </SliderTrack>
        </ColorSlider>
      )}

      <div className="flex items-center gap-2">
        <ColorSwatch
          className="size-8 shrink-0 rounded-md ring-1 ring-foreground/10 ring-inset"
          style={({ defaultStyle, color }) => ({ ...defaultStyle, ...overChecker(color.toString("css")) })}
        />
        <ColorField aria-label="Hex" className="min-w-0 flex-1">
          <Input
            className={({ isHovered, isFocused, isInvalid }) =>
              cn(
                "h-8 w-full min-w-0 rounded-md border bg-card px-2.5 text-sm text-foreground uppercase tabular-nums shadow-xs outline-none",
                "transition-[border-color,box-shadow] duration-150 ease-settle",
                isInvalid
                  ? "border-destructive"
                  : isFocused
                    ? "border-brand ring-[3px] ring-ring"
                    : isHovered
                      ? "border-border-strong"
                      : "border-input",
              )
            }
          />
        </ColorField>
      </div>

      {presets.length > 0 && (
        <div className="border-t border-border pt-3">
          {colors == null ? (
            <div aria-hidden="true" className="h-7" />
          ) : (
            <ColorSwatchPicker aria-label="Presets" className="flex flex-wrap justify-between gap-y-2">
              {colors.map((hex) => (
                <ColorSwatchPickerItem
                  key={hex}
                  color={hex}
                  className={({ isSelected, isFocusVisible }) =>
                    cn(
                      "relative size-7 cursor-default rounded-full p-0.5 outline-none",
                      "transition-[box-shadow,scale] duration-150 ease-settle data-[pressed]:scale-[0.92] motion-reduce:transition-none",
                      isSelected && "ring-2 ring-foreground/70",
                      isFocusVisible && "ring-[3px] ring-ring",
                    )
                  }
                >
                  <ColorSwatch className="size-full rounded-full ring-1 ring-foreground/10 ring-inset" />
                </ColorSwatchPickerItem>
              ))}
            </ColorSwatchPicker>
          )}
        </div>
      )}
    </div>
  );
}

interface SharedProps {
  value?: string | Color;
  defaultValue?: string | Color;
  onChange?: (color: Color) => void;
  presets?: readonly string[];
  showAlpha?: boolean;
}

export interface ColorPickerPanelProps extends SharedProps {
  label?: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function ColorPickerPanel({
  label,
  value,
  defaultValue = "#2F7FC1",
  onChange,
  presets = defaultColorPresets,
  showAlpha = false,
  className,
  ref,
}: ColorPickerPanelProps) {
  const labelId = useId();
  return (
    <AriaColorPicker value={value} defaultValue={defaultValue} onChange={onChange}>
      <div
        ref={ref}
        role="group"
        aria-labelledby={label != null ? labelId : undefined}
        className={cn("flex w-fit flex-col gap-3", className)}
      >
        {label != null && (
          <span id={labelId} className="text-sm font-medium text-foreground">
            {label}
          </span>
        )}
        <PanelContents presets={presets} showAlpha={showAlpha} />
      </div>
    </AriaColorPicker>
  );
}

const keyframes = `
@keyframes miyuki-color-picker-in {
  from { opacity: 0; transform: translateY(calc(var(--miyuki-color-picker-dir, -1) * 4px)) scale(0.96); }
}
@keyframes miyuki-color-picker-out { to { opacity: 0; transform: scale(0.98); } }
@keyframes miyuki-color-picker-fade-in { from { opacity: 0; } }
@keyframes miyuki-color-picker-fade-out { to { opacity: 0; } }
`;

export interface ColorPickerProps extends SharedProps {
  label?: ReactNode;
  description?: ReactNode;
  isDisabled?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export function ColorPicker({
  label,
  description,
  value,
  defaultValue = "#2F7FC1",
  onChange,
  presets = defaultColorPresets,
  showAlpha = false,
  isDisabled = false,
  className,
  ref,
}: ColorPickerProps) {
  const labelId = useId();
  const valueId = useId();
  const descriptionId = useId();

  return (
    <AriaColorPicker value={value} defaultValue={defaultValue} onChange={onChange}>
      {({ color }) => {
        const alpha = color.getChannelValue("alpha");
        return (
          <div ref={ref} className={cn("flex flex-col gap-1.5", isDisabled && "opacity-50", className)}>
            <style href="miyuki-color-picker" precedence="miyuki">
              {keyframes}
            </style>
            {label != null && (
              <span id={labelId} className="w-fit text-sm font-medium text-foreground">
                {label}
              </span>
            )}
            <DialogTrigger>
              <Button
                isDisabled={isDisabled}
                aria-labelledby={label != null ? `${labelId} ${valueId}` : valueId}
                aria-describedby={description != null ? descriptionId : undefined}
                className={({ isHovered, isFocusVisible, isPressed }) => {
                  const active = isFocusVisible || isPressed;
                  return cn(
                    "flex h-9 w-full min-w-0 cursor-default items-center gap-2.5 rounded-lg border bg-card ps-2 pe-2.5 text-start text-sm text-foreground shadow-xs outline-none select-none",
                    "transition-[border-color,box-shadow] duration-150 ease-settle data-[disabled]:cursor-not-allowed",
                    active ? "border-brand" : isHovered ? "border-border-strong" : "border-input",
                    active && "ring-[3px] ring-ring",
                  );
                }}
              >
                <ColorSwatch
                  className="size-5 shrink-0 rounded-full ring-1 ring-foreground/15 ring-inset"
                  style={({ defaultStyle, color: c }) => ({ ...defaultStyle, ...overChecker(c.toString("css")) })}
                />
                <span id={valueId} className="min-w-0 flex-1 truncate tabular-nums">
                  {color.toString("hex")}
                  {alpha < 1 && <span className="text-muted-foreground"> · {Math.round(alpha * 100)}%</span>}
                </span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </Button>
              <Popover
                placement="bottom start"
                offset={6}
                className={cn(
                  "overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none",
                  "[--miyuki-color-picker-ox:19px] [&[dir=rtl]]:[--miyuki-color-picker-ox:calc(100%_-_19px)]",
                  "origin-[var(--miyuki-color-picker-ox)_var(--miyuki-color-picker-oy,0px)] data-[placement=top]:[--miyuki-color-picker-oy:100%]",
                  "data-[placement=top]:[--miyuki-color-picker-dir:1]",
                  "data-[entering]:animate-[miyuki-color-picker-in_200ms_cubic-bezier(0.22,1,0.36,1)]",
                  "data-[exiting]:animate-[miyuki-color-picker-out_120ms_ease-in_forwards]",
                  "motion-reduce:data-[entering]:animate-[miyuki-color-picker-fade-in_120ms_ease-out]",
                  "motion-reduce:data-[exiting]:animate-[miyuki-color-picker-fade-out_100ms_ease-in_forwards]",
                )}
              >
                <Dialog
                  aria-labelledby={label != null ? labelId : undefined}
                  aria-label={label == null ? "Colour" : undefined}
                  className="outline-none"
                >
                  <PanelContents presets={presets} showAlpha={showAlpha} />
                </Dialog>
              </Popover>
            </DialogTrigger>
            {description != null && (
              <p id={descriptionId} className="text-[13px] leading-5 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        );
      }}
    </AriaColorPicker>
  );
}

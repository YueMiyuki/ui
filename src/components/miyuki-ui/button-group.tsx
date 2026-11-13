"use client";

import {
  Children,
  type ComponentProps,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
} from "react";
import {
  composeRenderProps,
  type Key,
  ToggleButton,
  ToggleButtonGroup,
  type ToggleButtonProps,
} from "react-aria-components";
import { ButtonGroupContext, type ButtonSize, type ButtonVariant, buttonStyles } from "@/components/miyuki-ui/button";
import { cn } from "@/lib/utils";

export type ButtonGroupOrientation = "horizontal" | "vertical";
export type ButtonGroupSelectionMode = "single" | "multiple";

const SizeContext = createContext<ButtonSize>("md");

interface JoinedChildProps {
  size?: ButtonSize;
  variant?: ButtonVariant;
  isDisabled?: boolean;
  className?: string | ((state: unknown) => string);
}

const joined: Record<ButtonGroupOrientation, string> = {
  horizontal: cn(
    "flex-row",
    "[&>*]:rounded-none! [&>*:first-child]:rounded-s-lg! [&>*:last-child]:rounded-e-lg!",
    "[&>*:not(:first-child)]:-ms-px",
  ),
  vertical: cn(
    "flex-col",
    "[&>*]:w-full [&>*]:rounded-none! [&>*:first-child]:rounded-t-lg! [&>*:last-child]:rounded-b-lg!",
    "[&>*:not(:first-child)]:-mt-px",
  ),
};

const shared = cn(
  "isolate inline-flex max-w-full rounded-lg shadow-xs",
  "[&>*]:shadow-none! [&>[data-focus-visible]]:z-10",
  "[&>[data-pressed]]:scale-100!",
  "[&>*]:before:pointer-events-none [&>*]:before:absolute [&>*]:before:inset-0 [&>*]:before:rounded-[inherit] [&>*]:before:bg-current [&>*]:before:opacity-0 [&>*]:before:transition-opacity [&>*]:before:duration-150",
  "[&>[data-pressed]]:before:opacity-[0.07]",
);

interface ButtonGroupBaseProps {
  orientation?: ButtonGroupOrientation;
  size?: ButtonSize;
  isDisabled?: boolean;
  children?: ReactNode;
  className?: string;
}

export interface ButtonGroupActionProps
  extends ButtonGroupBaseProps,
    Omit<ComponentProps<"div">, "children" | "className"> {
  selectionMode?: undefined;
  selectedKeys?: undefined;
  defaultSelectedKeys?: undefined;
  onSelectionChange?: undefined;
}

export interface ButtonGroupToggleProps extends ButtonGroupBaseProps {
  selectionMode: ButtonGroupSelectionMode;
  selectedKeys?: Iterable<Key>;
  defaultSelectedKeys?: Iterable<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
  disallowEmptySelection?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  ref?: Ref<HTMLDivElement>;
}

export type ButtonGroupProps = ButtonGroupActionProps | ButtonGroupToggleProps;

export function ButtonGroup(props: ButtonGroupProps) {
  if (props.selectionMode != null) {
    const { orientation = "horizontal", size = "md", className, children, ...rest } = props;
    return (
      <ToggleButtonGroup
        {...rest}
        orientation={orientation}
        className={cn(shared, joined[orientation], "data-[disabled]:shadow-none", className)}
      >
        <SizeContext value={size}>{children}</SizeContext>
      </ToggleButtonGroup>
    );
  }

  const {
    orientation = "horizontal",
    size = "md",
    isDisabled,
    className,
    children,
    /* eslint-disable @typescript-eslint/no-unused-vars */
    selectionMode: _mode,
    selectedKeys: _selected,
    defaultSelectedKeys: _default,
    onSelectionChange: _change,
    /* eslint-enable @typescript-eslint/no-unused-vars */
    ...rest
  } = props;

  return (
    <div
      role="group"
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
      {...rest}
      className={cn(shared, joined[orientation], isDisabled && "shadow-none", className)}
    >
      <ButtonGroupContext value={{ size, isDisabled }}>
        {Children.toArray(children).map((child, index) => {
          if (!isValidElement(child)) return child;
          const el = child as ReactElement<JoinedChildProps>;
          const divider =
            index > 0 && (el.props.variant ?? "primary") !== "secondary"
              ? orientation === "horizontal"
                ? "border-s border-current/20"
                : "border-t border-current/20"
              : undefined;
          const own = el.props.className;
          return cloneElement(el, {
            size: el.props.size ?? size,
            isDisabled: el.props.isDisabled ?? isDisabled,
            className: divider
              ? typeof own === "function"
                ? (state: unknown) => cn(divider, own(state))
                : cn(divider, own)
              : own,
          });
        })}
      </ButtonGroupContext>
    </div>
  );
}

export interface ButtonGroupItemProps extends Omit<ToggleButtonProps, "children"> {
  children?: ReactNode;
  iconStart?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function ButtonGroupItem({ children, iconStart, className, ...props }: ButtonGroupItemProps) {
  const size = useContext(SizeContext);
  const iconOnly = children == null;
  return (
    <ToggleButton
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          buttonStyles({ variant: "secondary", size, iconOnly }),
          "data-[selected]:bg-brand-soft data-[selected]:text-brand-strong data-[selected]:data-[hovered]:bg-brand-soft",
          cls,
        ),
      )}
    >
      {iconStart}
      {children != null && <span className="truncate">{children}</span>}
    </ToggleButton>
  );
}

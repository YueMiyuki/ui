"use client";

import { ArrowUp } from "lucide-react";
import { type CSSProperties, createContext, type Ref, useContext, useState } from "react";
import {
  Cell as AriaCell,
  type CellProps as AriaCellProps,
  Column as AriaColumn,
  type ColumnProps as AriaColumnProps,
  Row as AriaRow,
  type RowProps as AriaRowProps,
  Table as AriaTable,
  TableBody as AriaTableBody,
  type TableBodyProps as AriaTableBodyProps,
  TableHeader as AriaTableHeader,
  type TableHeaderProps as AriaTableHeaderProps,
  type TableProps as AriaTableProps,
  Collection,
  composeRenderProps,
  useTableOptions,
} from "react-aria-components";
import { Checkbox } from "@/components/miyuki-ui/checkbox";
import { cn } from "@/lib/utils";

export type TableDensity = "comfortable" | "compact";

const DensityContext = createContext<TableDensity>("comfortable");

const headerHeight: Record<TableDensity, number> = { comfortable: 40, compact: 36 };

const headerCell = cn(
  "border-b border-border bg-[color-mix(in_oklab,var(--muted)_60%,var(--card))] px-3 text-start align-middle first:ps-4 last:pe-4",
  "text-[13px] font-medium whitespace-nowrap text-muted-foreground outline-none",
  "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[focus-visible]:ring-inset",
);

export interface TableProps extends Omit<AriaTableProps, "className" | "style"> {
  maxHeight?: number | string;
  density?: TableDensity;
  className?: string;
  style?: CSSProperties;
  tableClassName?: string;
  ref?: Ref<HTMLTableElement>;
}

export function Table({
  maxHeight,
  density = "comfortable",
  className,
  style,
  tableClassName,
  ref,
  ...props
}: TableProps) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-xl border border-border bg-card", className)}
      style={style}
    >
      <div
        className="overflow-auto overscroll-contain"
        style={{ maxHeight }}
        onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
      >
        <DensityContext value={density}>
          <AriaTable
            {...props}
            ref={ref}
            className={cn(
              "w-full border-separate border-spacing-0 text-sm text-foreground tabular-nums outline-none",
              tableClassName,
            )}
          />
        </DensityContext>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 h-3 bg-linear-to-b from-foreground/[0.07] to-transparent dark:from-black/35",
          "transition-opacity duration-200",
          scrolled ? "opacity-100" : "opacity-0",
        )}
        style={{ top: headerHeight[density] }}
      />
    </div>
  );
}

export interface TableHeaderProps<T extends object = object> extends AriaTableHeaderProps<T> {
  ref?: Ref<HTMLTableSectionElement>;
}

export function TableHeader<T extends object>({ columns, children, className, ...props }: TableHeaderProps<T>) {
  const { selectionBehavior, selectionMode } = useTableOptions();
  const density = useContext(DensityContext);
  return (
    <AriaTableHeader {...props} className={composeRenderProps(className, (cls) => cn("sticky top-0 z-10", cls))}>
      {selectionBehavior === "toggle" && selectionMode !== "none" && (
        <AriaColumn className={cn(headerCell, "w-11 pe-0")} style={{ height: headerHeight[density] }}>
          {selectionMode === "multiple" && <Checkbox slot="selection" />}
        </AriaColumn>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaTableHeader>
  );
}

export interface ColumnProps extends AriaColumnProps {
  ref?: Ref<HTMLTableCellElement>;
}

export function Column({ children, className, style, ...props }: ColumnProps) {
  const density = useContext(DensityContext);
  return (
    <AriaColumn
      {...props}
      className={composeRenderProps(className, (cls, { allowsSorting, sortDirection }) =>
        cn(
          headerCell,
          "group/column transition-colors duration-150",
          allowsSorting && "cursor-default data-[hovered]:text-foreground",
          sortDirection && "text-foreground",
          cls,
        ),
      )}
      style={composeRenderProps(style, (s) => ({ height: headerHeight[density], ...s }))}
    >
      {composeRenderProps(children, (content, { allowsSorting, sortDirection }) => (
        <span className="inline-flex items-center gap-1.5">
          {content}
          {allowsSorting && (
            <ArrowUp
              aria-hidden="true"
              strokeWidth={2.25}
              className={cn(
                "size-3.5 shrink-0 transition-[rotate,opacity] duration-200 ease-settle motion-reduce:transition-[opacity]",
                sortDirection
                  ? "opacity-100"
                  : "opacity-0 group-data-[hovered]/column:opacity-50 group-data-[focus-visible]/column:opacity-50",
                sortDirection === "descending" && "rotate-180",
              )}
            />
          )}
        </span>
      ))}
    </AriaColumn>
  );
}

export interface TableBodyProps<T extends object = object> extends AriaTableBodyProps<T> {
  ref?: Ref<HTMLTableSectionElement>;
}

export function TableBody<T extends object>({ renderEmptyState, ...props }: TableBodyProps<T>) {
  return (
    <AriaTableBody
      {...props}
      renderEmptyState={
        renderEmptyState ??
        (() => <div className="px-4 py-10 text-center text-sm text-muted-foreground">No results</div>)
      }
    />
  );
}

export interface RowProps<T extends object = object> extends AriaRowProps<T> {
  ref?: Ref<HTMLTableRowElement>;
}

export function Row<T extends object>({ id, columns, children, className, ...props }: RowProps<T>) {
  const { selectionBehavior, selectionMode } = useTableOptions();
  return (
    <AriaRow
      id={id}
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "group/row outline-none transition-colors duration-100",
          "data-[hovered]:bg-accent/50 data-[selected]:bg-brand-soft/40 data-[selected]:data-[hovered]:bg-brand-soft/60",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[focus-visible]:ring-inset",
          (props.onAction || props.href || selectionMode !== "none") && "cursor-default",
          "data-[disabled]:opacity-50",
          cls,
        ),
      )}
    >
      {selectionBehavior === "toggle" && selectionMode !== "none" && (
        <Cell className="w-11 pe-0">
          <Checkbox slot="selection" />
        </Cell>
      )}
      <Collection items={columns}>{children}</Collection>
    </AriaRow>
  );
}

export interface CellProps extends AriaCellProps {
  ref?: Ref<HTMLTableCellElement>;
}

export function Cell({ className, ...props }: CellProps) {
  const density = useContext(DensityContext);
  return (
    <AriaCell
      {...props}
      className={composeRenderProps(className, (cls) =>
        cn(
          "border-b border-border px-3 align-middle outline-none group-last/row:border-b-0 first:ps-4 last:pe-4",
          "data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-ring data-[focus-visible]:ring-inset",
          density === "compact" ? "py-2" : "py-3",
          cls,
        ),
      )}
    />
  );
}

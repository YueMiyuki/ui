"use client";

import { Columns3, Download, Eye, MoreHorizontal, SearchX, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ComponentProps, type ReactElement, type ReactNode, useMemo, useState } from "react";
import { type Key, type Selection, type SortDescriptor, useLocale } from "react-aria-components";
import { Button } from "@/components/miyuki-ui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownSeparator,
} from "@/components/miyuki-ui/dropdown";
import { IconButton } from "@/components/miyuki-ui/icon-button";
import { Pagination } from "@/components/miyuki-ui/pagination";
import { SearchField } from "@/components/miyuki-ui/search-field";
import { Select, SelectItem } from "@/components/miyuki-ui/select";
import { Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/miyuki-ui/table";
import { cn } from "@/lib/utils";

export type DataTableTone = "neutral" | "brand" | "success" | "warning" | "destructive";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell?: (row: T) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  align?: "start" | "end";
  width?: number | string;
  isRowHeader?: boolean;
  hideable?: boolean;
  defaultHidden?: boolean;
}

export interface DataTableFilter<T> {
  id: string;
  label: string;
  allLabel?: string;
  value: (row: T) => string;
  options: { id: string; label: string; tone?: DataTableTone }[];
}

export interface DataTableAction {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: "default" | "destructive";
}

export interface DataTableProps<T extends object> extends Omit<ComponentProps<"div">, "title" | "children"> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId?: (row: T) => Key;
  pageSize?: number;
  pageSizes?: number[];
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  filters?: DataTableFilter<T>[];
  rowActions?: DataTableAction[];
  bulkActions?: DataTableAction[];
  onAction?: (action: string, rows: T[]) => void;
  noun?: [singular: string, plural: string];
  title?: ReactNode;
  description?: ReactNode;
}

const ALL = "__all";

const toneDot: Record<DataTableTone, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

const defaultRowActions: DataTableAction[] = [
  { id: "view", label: "View", icon: <Eye /> },
  { id: "delete", label: "Delete", icon: <Trash2 />, tone: "destructive" },
];

const defaultBulkActions: DataTableAction[] = [
  { id: "export", label: "Export", icon: <Download /> },
  { id: "delete", label: "Delete", icon: <Trash2 />, tone: "destructive" },
];

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function defaultId(row: object): Key {
  return (row as { id: Key }).id;
}

function menuItems(actions: DataTableAction[]) {
  return actions.flatMap((action, i) => {
    const item = (
      <DropdownItem key={action.id} id={action.id} icon={action.icon} tone={action.tone}>
        {action.label}
      </DropdownItem>
    );
    return action.tone === "destructive" && i > 0
      ? [<DropdownSeparator key={`${action.id}-separator`} />, item]
      : [item];
  }) as ReactElement[];
}

export function DataTable<T extends object>({
  columns,
  rows,
  getRowId = defaultId,
  pageSize = 10,
  pageSizes = [10, 20, 50],
  searchKeys,
  searchPlaceholder,
  filters = [],
  rowActions = defaultRowActions,
  bulkActions = defaultBulkActions,
  onAction,
  noun = ["row", "rows"],
  title,
  description,
  className,
  "aria-label": ariaLabel,
  ...props
}: DataTableProps<T>) {
  const reduce = useReducedMotion();
  const { locale } = useLocale();
  const count = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortDescriptor | undefined>();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const [picked, setPicked] = useState<Set<Key>>(() => new Set());

  const [one, many] = noun;
  const sizes = pageSizes.includes(size) ? pageSizes : [...pageSizes, size].sort((a, b) => a - b);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    const text = (row: T) =>
      searchKeys
        ? searchKeys.map((key) => String(row[key] ?? ""))
        : columns.map((c) => (c.value ? String(c.value(row) ?? "") : ""));
    return rows.filter((row) => {
      for (const f of filters) {
        const want = chosen[f.id];
        if (want && want !== ALL && f.value(row) !== want) return false;
      }
      return !q || text(row).some((value) => fold(value).includes(q));
    });
  }, [rows, query, chosen, filters, searchKeys, columns]);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.id === sort.column);
    if (!column?.value) return filtered;
    const read = column.value;
    const list = [...filtered].sort((a, b) => {
      const x = read(a);
      const y = read(b);
      if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
      return typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
    });
    return sort?.direction === "descending" ? list.reverse() : list;
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, pages);
  const pageRows = sorted.slice((current - 1) * size, current * size);
  const pageIds = pageRows.map(getRowId);

  const selected = useMemo(() => {
    const ids = new Set(rows.map(getRowId));
    return new Set([...picked].filter((id) => ids.has(id)));
  }, [rows, picked, getRowId]);
  const selectedRows = rows.filter((row) => selected.has(getRowId(row)));
  const tableSelection = new Set(pageIds.filter((id) => selected.has(id)));

  const onSelectionChange = (keys: Selection) => {
    const next = new Set(selected);
    for (const id of pageIds) next.delete(id);
    for (const id of keys === "all" ? pageIds : keys) next.add(id);
    setPicked(next);
  };

  const visible = columns.filter((c) => !hidden.has(c.id));
  const tableColumns = [...visible.map((c) => ({ id: c.id, column: c })), { id: "__actions", column: null }];
  const narrowed = query.trim() !== "" || filters.some((f) => chosen[f.id] && chosen[f.id] !== ALL);
  const labelColumn = columns.find((c) => c.isRowHeader) ?? columns[0];

  const clearFilters = () => {
    setQuery("");
    setChosen({});
    setPage(1);
  };

  const runBulk = (id: string) => {
    onAction?.(id, selectedRows);
    setPicked(new Set());
  };

  const firstShown = sorted.length === 0 ? 0 : (current - 1) * size + 1;
  const lastShown = Math.min(current * size, sorted.length);

  return (
    <div {...props} className={cn("@container flex w-full flex-col text-foreground", className)}>
      <div className="mb-4 flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground tabular-nums">
          {title ??
            (narrowed ? (
              <>
                {count.format(sorted.length)}{" "}
                <span className="font-normal text-muted-foreground">
                  of {count.format(rows.length)} {rows.length === 1 ? one : many}
                </span>
              </>
            ) : (
              <>
                {count.format(rows.length)} {rows.length === 1 ? one : many}
              </>
            ))}
        </h2>
        {description != null && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchField
          aria-label={searchPlaceholder ?? `Search ${many}`}
          placeholder={searchPlaceholder ?? `Search ${many}`}
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          className="w-full @xl:me-auto @xl:w-72"
        />
        {filters.map((filter) => (
          <Select
            key={filter.id}
            aria-label={filter.label}
            value={chosen[filter.id] ?? ALL}
            onChange={(key) => {
              setChosen((map) => ({ ...map, [filter.id]: String(key ?? ALL) }));
              setPage(1);
            }}
            className="min-w-0 flex-1 @xl:w-40 @xl:flex-none"
          >
            <SelectItem id={ALL}>{filter.allLabel ?? `All ${filter.label.toLowerCase()}`}</SelectItem>
            {filter.options.map((option) => (
              <SelectItem
                key={option.id}
                id={option.id}
                textValue={option.label}
                icon={
                  option.tone ? (
                    <span className="flex size-4 items-center justify-center">
                      <span className={cn("size-2 rounded-full", toneDot[option.tone])} />
                    </span>
                  ) : undefined
                }
              >
                {option.label}
              </SelectItem>
            ))}
          </Select>
        ))}
        <Dropdown>
          <Button variant="secondary" iconStart={<Columns3 />}>
            Columns
          </Button>
          <DropdownMenu
            placement="bottom end"
            indicator="check"
            selectionMode="multiple"
            shouldCloseOnSelect={false}
            disabledKeys={columns.filter((c) => c.hideable === false || c.isRowHeader).map((c) => c.id)}
            selectedKeys={visible.map((c) => c.id)}
            onSelectionChange={(keys) => {
              if (keys === "all") return setHidden(new Set());
              setHidden(new Set(columns.filter((c) => !keys.has(c.id)).map((c) => c.id)));
            }}
          >
            <DropdownSection title="Show columns">
              {columns.map((c) => (
                <DropdownItem key={c.id} id={c.id}>
                  {c.header}
                </DropdownItem>
              ))}
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      </div>

      <AnimatePresence initial={false}>
        {selected.size > 0 && (
          <motion.div
            key="bulk"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
            transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
            className="overflow-clip"
          >
            <div
              role="region"
              aria-label="Selection"
              className="mb-3 flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-brand/20 bg-brand-soft/70 py-1.5 ps-4 pe-1.5 dark:border-brand/25"
            >
              <span role="status" className="text-sm font-medium text-foreground tabular-nums">
                {count.format(selected.size)} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setPicked(new Set())}
                className="text-brand-strong data-[hovered]:bg-brand/10"
              >
                Clear
              </Button>
              <div className="ms-auto flex items-center gap-1.5">
                {bulkActions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.tone === "destructive" ? "destructive" : "secondary"}
                    iconStart={action.icon}
                    onPress={() => runBulk(action.id)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Table
        aria-label={ariaLabel ?? many}
        density="compact"
        selectionMode="multiple"
        selectedKeys={tableSelection}
        onSelectionChange={onSelectionChange}
        sortDescriptor={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
      >
        <TableHeader columns={tableColumns}>
          {({ id, column }) =>
            column ? (
              <Column
                id={id}
                isRowHeader={column.isRowHeader}
                allowsSorting={column.sortable}
                style={column.width != null ? { width: column.width } : undefined}
                className={cn(
                  column.align === "end" && "text-end [&>span]:flex [&>span]:flex-row-reverse [&>span]:justify-start",
                )}
              >
                {column.header}
              </Column>
            ) : (
              <Column id={id} aria-label="Actions" className="w-12" />
            )
          }
        </TableHeader>
        <TableBody
          items={pageRows.map((row) => ({ id: getRowId(row), row }))}
          dependencies={[tableColumns.length, visible.map((c) => c.id).join(), rowActions]}
          renderEmptyState={() => (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <SearchX aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">No {many} match</p>
                <p className="text-[13px] text-muted-foreground">Try another search or clear the filters.</p>
              </div>
              {narrowed && (
                <Button variant="secondary" size="sm" onPress={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          )}
        >
          {({ id, row }) => (
            <Row id={id} columns={tableColumns}>
              {({ column }) =>
                column ? (
                  <Cell
                    className={cn(
                      column.align === "end" && "text-end tabular-nums",
                      column.isRowHeader ? "font-medium" : "whitespace-nowrap",
                    )}
                  >
                    {column.cell ? column.cell(row) : String(column.value?.(row) ?? "")}
                  </Cell>
                ) : (
                  <Cell className="w-12 py-0 ps-0 pe-2 text-end">
                    <Dropdown>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label={`Actions for ${labelColumn?.value?.(row) ?? id}`}
                        className="text-muted-foreground data-[hovered]:text-foreground data-[pressed]:text-foreground"
                      >
                        <MoreHorizontal />
                      </IconButton>
                      <DropdownMenu placement="bottom end" onAction={(key) => onAction?.(String(key), [row])}>
                        {menuItems(rowActions)}
                      </DropdownMenu>
                    </Dropdown>
                  </Cell>
                )
              }
            </Row>
          )}
        </TableBody>
      </Table>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="hidden @md:inline">Rows per page</span>
          <Select
            aria-label="Rows per page"
            size="sm"
            value={size}
            onChange={(key) => {
              setSize(Number(key));
              setPage(1);
            }}
            className="w-[72px]"
          >
            {sizes.map((n) => (
              <SelectItem key={n} id={n} textValue={String(n)}>
                {n}
              </SelectItem>
            ))}
          </Select>
          <span className="whitespace-nowrap tabular-nums">
            {sorted.length === 0 ? "0" : `${firstShown}–${lastShown}`} of {count.format(sorted.length)}
          </span>
        </div>
        <Pagination page={current} total={pages} onChange={setPage} />
      </div>
    </div>
  );
}

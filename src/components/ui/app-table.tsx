"use client";

import * as React from "react";
import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Badge } from "./badge";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";

// Helper function to get nested object values
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((current: any, key) => current?.[key], obj);
}

export interface BaseColumnConfig<TData = unknown> {
  /** Unique identifier for the column */
  key: string;
  /** Display title for the column header */
  title: string;
  /** Optional width styling */
  width?: string;
  /** CSS class for the column header */
  headerClassName?: string;
  /** CSS class for the column cells */
  cellClassName?: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Hide column on mobile */
  hideOnMobile?: boolean;
}

export interface TextColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "text";
  /** Key path to access the data (supports nested objects) */
  dataKey: keyof TData | string;
  /** Transform function for the text value */
  transform?: (value: unknown) => string;
}

export interface NumberColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "number";
  dataKey: keyof TData | string;
  /** Number formatting options */
  format?: {
    /** Number of decimal places */
    decimals?: number;
    /** Currency symbol */
    currency?: string;
    /** Locale for formatting */
    locale?: string;
  };
}

export interface DateColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "date";
  dataKey: keyof TData | string;
  /** Date format string (dayjs format) */
  dateFormat?: string;
}

export interface BooleanColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "boolean";
  dataKey: keyof TData | string;
  /** Custom labels for true/false values */
  labels?: {
    true: string;
    false: string;
  };
  /** Render as badge instead of text */
  asBadge?: boolean;
}

export interface BadgeColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "badge";
  dataKey: keyof TData | string;
  /** Badge variant mapping based on value */
  variantMap?: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  >;
  /** Transform function for badge text */
  transform?: (value: unknown) => string;
}

export interface LongTextColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "longText";
  dataKey: keyof TData | string;
  /** Maximum characters to show before truncation */
  maxLength?: number;
  /** Show expand/collapse toggle */
  expandable?: boolean;
}

export interface AvatarColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "avatar";
  /** Key for the image URL */
  imageKey: keyof TData | string;
  /** Key for the fallback text */
  fallbackKey?: keyof TData | string;
  /** Size of the avatar */
  size?: "sm" | "md" | "lg";
}

export interface ActionsColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "actions";
  /** Actions to show */
  actions?: {
    layout?: "menu" | "inline";
    edit?: {
      show?: (data: TData) => boolean;
      onClick: (data: TData, index: number) => void;
      label?: string;
      icon?: React.ReactNode;
      variant?: React.ComponentProps<typeof Button>["variant"];
      size?: React.ComponentProps<typeof Button>["size"];
      className?: string;
    };
    delete?: {
      show?: (data: TData) => boolean;
      onClick: (data: TData, index: number) => void;
      label?: string;
      icon?: React.ReactNode;
      variant?: React.ComponentProps<typeof Button>["variant"];
      size?: React.ComponentProps<typeof Button>["size"];
      className?: string;
    };
    custom?: Array<{
      label: string;
      icon?: React.ReactNode;
      show?: (data: TData) => boolean;
      onClick: (data: TData, index: number) => void;
      variant?: React.ComponentProps<typeof Button>["variant"];
      size?: React.ComponentProps<typeof Button>["size"];
      className?: string;
    }>;
  };
}

export interface CustomColumnConfig<TData = unknown>
  extends BaseColumnConfig<TData> {
  type: "custom";
  /** Custom render function for the cell */
  render: (data: TData, rowIndex: number) => React.ReactNode;
}

export type ColumnConfig<TData = unknown> =
  | TextColumnConfig<TData>
  | NumberColumnConfig<TData>
  | DateColumnConfig<TData>
  | BooleanColumnConfig<TData>
  | BadgeColumnConfig<TData>
  | LongTextColumnConfig<TData>
  | AvatarColumnConfig<TData>
  | ActionsColumnConfig<TData>
  | CustomColumnConfig<TData>;

export interface AppTableProps<TData = unknown>
  extends Omit<React.ComponentProps<"table">, "children"> {
  /** Array of column configurations */
  columns: ColumnConfig<TData>[];
  /** Array of data to display */
  data: TData[];
  /** Optional table caption */
  caption?: string;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (data: TData, index: number) => void;
  /** Custom row className function */
  rowClassName?: (data: TData, index: number) => string;
}

function renderCell<TData>(
  column: ColumnConfig<TData>,
  data: TData,
  rowIndex: number,
): React.ReactNode {
  if (column.type === "custom") {
    return column.render(data, rowIndex);
  }

  if (column.type === "actions") {
    const { actions = {} } = column;
    const {
      edit,
      delete: deleteAction,
      custom = [],
      layout = "menu",
    } = actions;

    const menuItems: {
      key: string;
      label: string;
      icon?: React.ReactNode;
      onClick: () => void;
    }[] = [];

    const inlineItems: {
      key: string;
      label: string;
      icon?: React.ReactNode;
      onClick: () => void;
      variant?: React.ComponentProps<typeof Button>["variant"];
      size?: React.ComponentProps<typeof Button>["size"];
      className?: string;
    }[] = [];

    if (edit && (!edit.show || edit.show(data))) {
      const common = {
        key: "edit",
        label: edit.label || "Edit",
        icon:
          edit.icon ||
          (layout === "inline" ? (
            <Edit className="h-3 w-3" />
          ) : (
            <Edit className="h-4 w-4" />
          )),
        onClick: () => edit.onClick(data, rowIndex),
      };

      if (layout === "inline") {
        inlineItems.push({
          ...common,
          variant: edit.variant || "ghost",
          size: edit.size || "sm",
          className: edit.className,
        });
      } else {
        menuItems.push(common);
      }
    }

    if (deleteAction && (!deleteAction.show || deleteAction.show(data))) {
      const common = {
        key: "delete",
        label: deleteAction.label || "Delete",
        icon:
          deleteAction.icon ||
          (layout === "inline" ? (
            <Trash2 className="h-3 w-3" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )),
        onClick: () => deleteAction.onClick(data, rowIndex),
      };

      if (layout === "inline") {
        inlineItems.push({
          ...common,
          variant: deleteAction.variant || "destructive",
          size: deleteAction.size || "sm",
          className: deleteAction.className,
        });
      } else {
        menuItems.push(common);
      }
    }

    for (const [index, action] of custom.entries()) {
      if (!action.show || action.show(data)) {
        const key = `custom-${index}`;
        const common = {
          key,
          label: action.label,
          icon: action.icon,
          onClick: () => action.onClick(data, rowIndex),
        };

        if (layout === "inline") {
          inlineItems.push({
            ...common,
            variant: action.variant || "ghost",
            size: action.size || "sm",
            className: action.className,
          });
        } else {
          menuItems.push(common);
        }
      }
    }

    if (layout === "inline") {
      if (inlineItems.length === 0) return null;

      return (
        <div className="flex items-center gap-2">
          {inlineItems.map((item) => (
            <Button
              key={item.key}
              variant={item.variant}
              size={item.size}
              className={cn("flex items-center gap-1", item.className)}
              onClick={(event) => {
                event.stopPropagation();
                item.onClick();
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </Button>
          ))}
        </div>
      );
    }

    if (menuItems.length === 0) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {menuItems.map((item) => (
            <DropdownMenuItem key={item.key} onClick={item.onClick}>
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (column.type === "avatar") {
    const imageValue = getNestedValue(data, column.imageKey as string);
    const fallbackValue = column.fallbackKey
      ? getNestedValue(data, column.fallbackKey as string)
      : "";

    const sizeClass = {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-10 w-10",
    }[column.size || "md"];

    return (
      <Avatar className={sizeClass}>
        <AvatarImage
          src={String(imageValue || "")}
          alt={String(fallbackValue)}
        />
        <AvatarFallback>
          {String(fallbackValue).charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Get value for columns that have dataKey
  let value: unknown;
  if ("dataKey" in column) {
    value = getNestedValue(data, column.dataKey as string);
  }

  switch (column.type) {
    case "text": {
      const textValue = column.transform
        ? column.transform(value)
        : String(value || "");
      return <span>{textValue}</span>;
    }

    case "longText": {
      const textValue = String(value || "");
      const { maxLength = 100, expandable = false } = column;

      if (!expandable || textValue.length <= maxLength) {
        const truncated =
          textValue.length > maxLength
            ? `${textValue.slice(0, maxLength)}...`
            : textValue;
        return <span>{truncated}</span>;
      }

      const [expanded, setExpanded] = React.useState(false);

      return (
        <div>
          <span>
            {expanded ? textValue : `${textValue.slice(0, maxLength)}...`}
          </span>
          <Button
            variant="link"
            size="sm"
            className="ml-1 h-auto p-0 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        </div>
      );
    }

    case "number": {
      const numValue = Number(value);
      if (Number.isNaN(numValue)) return <span>-</span>;

      const { decimals = 0, currency, locale = "es-AR" } = column.format || {};

      if (currency) {
        return (
          <span>
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency,
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }).format(numValue)}
          </span>
        );
      }

      return (
        <span>
          {new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(numValue)}
        </span>
      );
    }

    case "date": {
      if (!value) return <span>-</span>;

      const date = dayjs(value as string | number | Date);
      if (!date.isValid()) return <span>Invalid Date</span>;

      const dateFormat = column.dateFormat || "MMM DD, YYYY";
      return <span>{date.format(dateFormat)}</span>;
    }

    case "boolean": {
      const boolValue = Boolean(value);
      const { labels = { true: "Yes", false: "No" }, asBadge = false } = column;
      const label = labels[boolValue ? "true" : "false"];

      if (asBadge) {
        return (
          <Badge variant={boolValue ? "default" : "secondary"}>{label}</Badge>
        );
      }

      return <span>{label}</span>;
    }

    case "badge": {
      const stringValue = String(value || "");
      const displayValue = column.transform
        ? column.transform(value)
        : stringValue;
      const variant = column.variantMap?.[stringValue] || "default";

      return <Badge variant={variant}>{displayValue}</Badge>;
    }

    default:
      return <span>{String(value || "")}</span>;
  }
}

function TableSkeleton<TData>({
  columns,
}: {
  columns: ColumnConfig<TData>[];
}) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <TableRow key={`${rowIndex + 1}`}>
          {columns.map((column) => (
            <TableCell
              key={column.key}
              className={cn(
                column.cellClassName,
                column.hideOnMobile && "hidden sm:table-cell",
              )}
            >
              <div className="h-4 animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function AppTable<TData = unknown>({
  columns,
  data,
  caption,
  loading = false,
  emptyMessage = "No data available",
  emptyState,
  onRowClick,
  rowClassName,
  className,
  ...tableProps
}: AppTableProps<TData>) {
  return (
    <Table className={className} {...tableProps}>
      {caption && <caption>{caption}</caption>}

      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={cn(
                column.headerClassName,
                column.hideOnMobile && "hidden sm:table-cell",
              )}
              style={{ width: column.width }}
            >
              {column.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          <TableSkeleton<TData> columns={columns} />
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-8 text-center">
              {emptyState || (
                <div className="text-muted-foreground">{emptyMessage}</div>
              )}
            </TableCell>
          </TableRow>
        ) : (
          data.map((item, index) => (
            <TableRow
              key={`${index + 1}`}
              className={cn(
                onRowClick && "cursor-pointer",
                rowClassName?.(item, index),
              )}
              onClick={onRowClick ? () => onRowClick(item, index) : undefined}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    column.cellClassName,
                    column.hideOnMobile && "hidden sm:table-cell",
                  )}
                >
                  {renderCell(column, item, index)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

import type { ReactNode } from "react";

import { TableSurface } from "@/components/shared/LayoutPatterns";
import { cn } from "@/lib/utils/cn";

export type DataTableColumn<Row> = {
  align?: "left" | "center" | "right";
  header: ReactNode;
  id: string;
  render: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  caption,
  columns,
  getRowKey,
  mobileCard,
  rows,
}: {
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  mobileCard: (row: Row) => ReactNode;
  rows: readonly Row[];
}) {
  return (
    <>
      <TableSurface className="hidden md:block">
        <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted text-muted-foreground border-b text-xs font-medium">
            <tr>
              {columns.map((column) => (
                <th
                  className={cn(
                    "px-4 py-3 whitespace-nowrap",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                  )}
                  key={column.id}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr className="hover:bg-muted/70" key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    className={cn(
                      "px-4 py-3 align-middle",
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right tabular-nums",
                    )}
                    key={column.id}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableSurface>
      <div aria-label={caption} className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <div key={getRowKey(row)}>{mobileCard(row)}</div>
        ))}
      </div>
    </>
  );
}

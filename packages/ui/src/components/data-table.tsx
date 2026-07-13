import * as React from "react";

import { cn } from "../lib/utils";

export interface DataTableColumn<T> {
  /** Chave única da coluna. */
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  /** Classe extra aplicada à célula (th/td). */
  className?: string;
  cell: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: React.ReactNode;
  className?: string;
}

const alignClass: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Tabela genérica no estilo "cartoon". Puramente apresentacional (server-safe):
 * paginação/ordenação/busca ficam a cargo da página (ex.: via URL + links), não
 * deste componente. Rola horizontalmente em telas estreitas.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "Nenhum registro encontrado.",
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "bg-card overflow-x-auto rounded-2xl border-2 border-border shadow-cartoon",
        className
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2 font-semibold whitespace-nowrap",
                  alignClass[col.align ?? "left"],
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-muted-foreground px-3 py-6 text-center font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)} className="border-t-2 border-border">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2 align-middle",
                      alignClass[col.align ?? "left"],
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

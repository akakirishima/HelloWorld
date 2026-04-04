import type { ReactNode } from "react";

type DataTableProps = {
  columns: string[];
  children: ReactNode;
};

export function DataTable({ columns, children }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <div
        className="grid gap-px bg-slate-200 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((column) => (
          <div key={column} className="bg-slate-50 px-4 py-3">
            {column}
          </div>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}

type DataRowProps = {
  cells: ReactNode[];
};

export function DataRow({ cells }: DataRowProps) {
  return (
    <div
      className="grid border-t border-slate-200 text-sm text-slate-700"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) => (
        <div key={index} className="px-4 py-4">
          {cell}
        </div>
      ))}
    </div>
  );
}

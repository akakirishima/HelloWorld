import type { DashboardMatrixColumn, DashboardMatrixRow } from "@/types/app";

import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type StatusMatrixBoardProps = {
  rows: DashboardMatrixRow[];
  className?: string;
  fullscreen?: boolean;
  interactive?: boolean;
  visibleColumns?: StatusColumnKey[];
  onCellSelect?: (
    rowId: string,
    column: StatusColumnKey,
  ) => void | Promise<void>;
};

type ColumnDef = {
  key: DashboardMatrixColumn;
  label: string;
  helper?: string;
};

type StatusColumnDef = {
  key: StatusColumnKey;
  label: string;
  helper?: string;
};

type StatusColumnKey = Exclude<DashboardMatrixColumn, "name">;

const columns: ColumnDef[] = [
  { key: "name", label: "Name" },
  { key: "room", label: "Room" },
  { key: "onCampus", label: "On Campus" },
  { key: "class", label: "Class" },
  { key: "seminarMeeting", label: "Seminar Meeting" },
  { key: "home", label: "Home", helper: "Off Campus" },
];
const columnsByKey = new Map<DashboardMatrixColumn, ColumnDef>(
  columns.map((column) => [column.key, column]),
);

export function StatusMatrixBoard({
  rows,
  className,
  fullscreen = false,
  interactive = false,
  visibleColumns,
  onCellSelect,
}: StatusMatrixBoardProps) {
  const statusColumnKeys = visibleColumns ?? columns.slice(1).map((column) => column.key);
  const statusColumns = statusColumnKeys
    .map((key) => columnsByKey.get(key))
    .filter((column): column is StatusColumnDef => column !== undefined);
  const gridTemplateColumns = `2fr repeat(${statusColumns.length}, minmax(0, 1fr))`;

  return (
    <div
      data-testid={fullscreen ? "fullscreen-board" : "status-matrix-board"}
      className={cn(
        "overflow-x-auto bg-[#f7f8f4]",
        fullscreen
          ? "h-full w-full rounded-none border-0 shadow-none"
          : "rounded-[28px] border border-slate-200 shadow-soft",
        className,
      )}
    >
      <div className={cn(fullscreen ? "min-h-full min-w-full" : "min-w-[880px]")}>
        <StatusMatrixHeader fullscreen={fullscreen} columns={statusColumns} gridTemplateColumns={gridTemplateColumns} />
        <div>
          {rows.map((row) => (
            <StatusMatrixRow
              key={row.id}
              fullscreen={fullscreen}
              interactive={interactive}
              statusColumns={statusColumns}
              onCellSelect={onCellSelect}
              row={row}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusMatrixHeader({
  fullscreen,
  columns,
  gridTemplateColumns,
}: {
  fullscreen: boolean;
  columns: StatusColumnDef[];
  gridTemplateColumns: string;
}) {
  return (
    <div
      className="grid border-b border-[#c7cfbf] bg-[#6f8b5b] text-white"
      style={{ gridTemplateColumns }}
    >
      {columns.map((column) => (
        <div
          key={column.key}
          className={cn(
            "flex items-center justify-center border-r border-white/20 px-3 text-center",
            fullscreen ? "min-h-[72px] sm:min-h-[84px]" : "min-h-[68px]",
            fullscreen ? "px-3 sm:px-5" : "px-4",
          )}
        >
          <div>
            <p className={cn("font-semibold tracking-[0.04em]", fullscreen ? "text-sm sm:text-lg" : "text-sm")}>
              {column.label}
            </p>
            {column.helper ? (
              <p
                className={cn(
                  "mt-1 font-medium uppercase tracking-[0.18em] text-white/80",
                  fullscreen ? "text-[10px] sm:text-[13px]" : "text-[11px]",
                )}
              >
                {column.helper}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusMatrixRow({
  row,
  fullscreen,
  interactive,
  statusColumns,
  onCellSelect,
}: {
  row: DashboardMatrixRow;
  fullscreen: boolean;
  interactive: boolean;
  statusColumns: StatusColumnDef[];
  onCellSelect?: (
    rowId: string,
    column: StatusColumnKey,
  ) => void | Promise<void>;
}) {
  const isHomeRow = row.activeColumn === "home" || row.statusLabel === "Off Campus";
  const isResearcher = row.academicGrade === "Researcher";
  const showReadOnlySummary = !interactive;

  return (
    <div
      className={cn(
        "grid border-b text-sm transition-colors",
        isHomeRow
          ? "border-[#aeb9a7] bg-[#cad3c5] text-slate-700 even:bg-[#bcc8b8]"
          : "border-[#d8dfd1] bg-[#fcfdf9] text-slate-800 even:bg-[#f3f7ee]",
      )}
      style={{ gridTemplateColumns: `2fr repeat(${statusColumns.length}, minmax(0, 1fr))` }}
      data-testid={`matrix-row-${row.id}`}
    >
      <div
        className={cn(
          "flex flex-col justify-center border-r px-5 transition-colors",
          isHomeRow ? "border-[#aeb9a7]" : "border-[#d8dfd1]",
          fullscreen ? "min-h-[82px] px-3 sm:min-h-[94px] sm:px-5" : "min-h-[64px]",
        )}
      >
        <div className="flex flex-col">
          <p
            className={cn(
              "font-semibold",
              isHomeRow ? "text-slate-700" : "text-slate-950",
              fullscreen ? "text-[1rem] leading-none sm:text-[1.65rem]" : "text-base",
            )}
          >
            {row.name}
            {!isResearcher ? (
              <span
                className={cn(
                  "ml-2 font-medium",
                  isHomeRow ? "text-slate-500" : "text-slate-600",
                  fullscreen ? "text-sm sm:text-[1.15rem]" : "text-sm",
                )}
              >
                ({row.academicGrade})
              </span>
            ) : null}
          </p>
          {isResearcher ? (
            <p
              className={cn(
                "mt-1 font-medium",
                isHomeRow ? "text-slate-500" : "text-slate-600",
                fullscreen ? "text-sm sm:text-[1.05rem]" : "text-sm",
              )}
            >
              ({row.academicGrade})
            </p>
          ) : null}
        </div>
        {showReadOnlySummary ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge
              text={`current: ${row.statusLabel}`}
              tone={isHomeRow ? "neutral" : "info"}
            />
            <span
              className={cn(
                "text-xs font-medium",
                isHomeRow ? "text-slate-500" : "text-slate-600",
                fullscreen ? "sm:text-sm" : "text-[11px]",
              )}
            >
              概要画面は確認専用
            </span>
          </div>
        ) : (
          <div
            className={cn(
              isResearcher ? "mt-2 flex items-center gap-2" : "mt-1 flex items-center gap-2",
              isHomeRow ? "text-slate-500" : "text-slate-600",
              fullscreen ? "text-xs sm:text-base" : "text-xs",
            )}
          >
            <span>{row.checkInAt}</span>
          </div>
        )}
      </div>

      {statusColumns.map((column) => {
        const isActive = row.activeColumn === column.key;
        const cellContent = isActive ? (
          interactive ? (
            <StatusMarker
              fullscreen={fullscreen}
              label={`${row.name}: ${row.statusLabel}`}
              testId={`matrix-marker-${row.id}`}
            />
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              {row.statusLabel}
            </div>
          )
        ) : (
          <div className="h-3 w-3 rounded-full border border-slate-300 bg-white/85" />
        );

        return interactive ? (
          <button
            aria-label={`${row.name} を ${column.label} に変更`}
            data-testid={`matrix-cell-${row.id}-${column.key}`}
            key={column.key}
            className={cn(
              "flex items-center justify-center border-r transition",
              isHomeRow ? "border-[#aeb9a7]" : "border-[#d8dfd1]",
              fullscreen ? "min-h-[82px] sm:min-h-[94px]" : "min-h-[64px]",
              interactive &&
              (isHomeRow
                ? "cursor-pointer hover:bg-[#b6c1b1] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-inset"
                : "cursor-pointer hover:bg-[#eef5e6] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-inset"),
              isActive && (isHomeRow ? "bg-[#aeb9a9]" : "bg-[#e8f3dd]"),
            )}
            disabled={!interactive}
            onClick={() => {
              void onCellSelect?.(row.id, column.key);
            }}
            type="button"
          >
            {cellContent}
          </button>
        ) : (
          <div
            key={column.key}
            className={cn(
              "flex items-center justify-center border-r transition-colors",
              isHomeRow ? "border-[#aeb9a7]" : "border-[#d8dfd1]",
              fullscreen ? "min-h-[82px] sm:min-h-[94px]" : "min-h-[64px]",
              isActive && (isHomeRow ? "bg-[#aeb9a9]" : "bg-[#e8f3dd]"),
            )}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}

function StatusMarker(props: { label: string; testId: string; fullscreen: boolean }) {
  return (
    <div
      aria-label={props.label}
      className={cn(
        "rounded-full border-[3px] border-sky-800 bg-[radial-gradient(circle_at_34%_30%,_#44d4ff,_#1787c8_62%,_#0e6598_100%)] ring-2 ring-white/65",
        props.fullscreen
          ? "h-11 w-11 shadow-[0_8px_14px_rgba(12,71,102,0.24)] sm:h-14 sm:w-14 sm:shadow-[0_10px_18px_rgba(12,71,102,0.28)]"
          : "h-10 w-10 shadow-[0_6px_12px_rgba(12,71,102,0.24)]",
      )}
      data-testid={props.testId}
      role="img"
    />
  );
}

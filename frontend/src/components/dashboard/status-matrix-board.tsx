import type { DashboardMatrixColumn, DashboardMatrixRow } from "@/types/app";

import { cn } from "@/lib/utils";

type StatusMatrixBoardProps = {
  rows: DashboardMatrixRow[];
  className?: string;
  fullscreen?: boolean;
  interactive?: boolean;
  onCellSelect?: (
    rowId: string,
    column: Exclude<DashboardMatrixColumn, "name">,
  ) => void | Promise<void>;
};

const columns: Array<{ key: DashboardMatrixColumn; label: string; helper?: string }> = [
  { key: "name", label: "Name" },
  { key: "room", label: "Room" },
  { key: "onCampus", label: "On Campus" },
  { key: "class", label: "Class" },
  { key: "seminarMeeting", label: "Seminar Meeting" },
  { key: "home", label: "Home", helper: "Off Campus" },
];
const statusColumns = columns.slice(1) as Array<{
  key: Exclude<DashboardMatrixColumn, "name">;
  label: string;
  helper?: string;
}>;

export function StatusMatrixBoard({
  rows,
  className,
  fullscreen = false,
  interactive = false,
  onCellSelect,
}: StatusMatrixBoardProps) {
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
        <StatusMatrixHeader fullscreen={fullscreen} />
        <div>
          {rows.map((row) => (
            <StatusMatrixRow
              key={row.id}
              fullscreen={fullscreen}
              interactive={interactive}
              onCellSelect={onCellSelect}
              row={row}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusMatrixHeader({ fullscreen }: { fullscreen: boolean }) {
  return (
    <div
      className="grid border-b border-[#c7cfbf] bg-[#6f8b5b] text-white"
      style={{ gridTemplateColumns: "2fr repeat(5, minmax(0, 1fr))" }}
    >
      {columns.map((column) => (
        <div
          key={column.key}
          className={cn(
            "flex items-center justify-center border-r border-white/20 px-3 text-center",
            fullscreen ? "min-h-[72px] sm:min-h-[84px]" : "min-h-[68px]",
            column.key === "name" && (fullscreen ? "justify-start px-3 sm:px-5" : "justify-start px-5"),
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
  onCellSelect,
}: {
  row: DashboardMatrixRow;
  fullscreen: boolean;
  interactive: boolean;
  onCellSelect?: (
    rowId: string,
    column: Exclude<DashboardMatrixColumn, "name">,
  ) => void | Promise<void>;
}) {
  const isHomeRow = row.activeColumn === "home" || row.statusLabel === "Off Campus";
  const isResearcher = row.academicGrade === "Researcher";

  return (
    <div
      className={cn(
        "grid border-b text-sm transition-colors",
        isHomeRow
          ? "border-[#aeb9a7] bg-[#cad3c5] text-slate-700 even:bg-[#bcc8b8]"
          : "border-[#d8dfd1] bg-[#fcfdf9] text-slate-800 even:bg-[#f3f7ee]",
      )}
      style={{ gridTemplateColumns: "2fr repeat(5, minmax(0, 1fr))" }}
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
        <div
          className={cn(
            isResearcher ? "mt-2 flex items-center gap-2" : "mt-1 flex items-center gap-2",
            isHomeRow ? "text-slate-500" : "text-slate-600",
            fullscreen ? "text-xs sm:text-base" : "text-xs",
          )}
        >
          <span>{row.checkInAt}</span>
        </div>
      </div>

      {statusColumns.map((column) => {
        const isActive = row.activeColumn === column.key;

        return (
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
            {isActive ? (
              <StatusMarker
                fullscreen={fullscreen}
                label={`${row.name}: ${row.statusLabel}`}
                testId={`matrix-marker-${row.id}`}
              />
            ) : (
              <div className="h-10 w-10 rounded-full border border-transparent" />
            )}
          </button>
        )
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

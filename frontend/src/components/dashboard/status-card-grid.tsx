import type { DashboardMatrixRow } from "@/types/app";

import { Crosshair, FlaskConical, GraduationCap, Home, School, Trophy } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

type StatusCardGridProps = {
  rows: DashboardMatrixRow[];
  className?: string;
  fillViewport?: boolean;
  disabledSections?: SectionKey[];
  onSectionSelect?: (rowId: string, section: SectionKey) => Promise<void> | void;
};

type SectionKey = "lab" | "onCampus" | "class" | "home";

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "lab", label: "Lab" },
  { key: "onCampus", label: "On Campus" },
  { key: "class", label: "class" },
  { key: "home", label: "Home" },
];

const sectionIcons: Record<SectionKey, typeof FlaskConical> = {
  lab: FlaskConical,
  onCampus: School,
  class: GraduationCap,
  home: Home,
};

export function StatusCardGrid({
  rows,
  className,
  fillViewport = false,
  disabledSections = [],
  onSectionSelect,
}: StatusCardGridProps) {
  const hasFeaturedRank = rows.some((row) => row.weeklyRank === 1);
  const rowCount = Math.max(1, Math.ceil((rows.length + (hasFeaturedRank ? 3 : 0)) / 2));

  return (
    <div
      className={cn(
        "grid grid-cols-2",
        fillViewport ? "h-full min-h-0 w-full gap-1.5" : "gap-4",
        className,
      )}
      data-testid="status-card-grid"
      style={
        fillViewport
          ? {
              gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
            }
          : undefined
      }
    >
      {rows.map((row, index) => (
        <StatusCard
          key={row.id}
          fillViewport={fillViewport}
          disabledSections={disabledSections}
          onSectionSelect={onSectionSelect}
          row={row}
          isFeatured={row.weeklyRank === 1}
          isLast={index === rows.length - 1}
        />
      ))}
    </div>
  );
}

const HOLD_MS = 700;

function StatusCard({
  row,
  fillViewport,
  disabledSections,
  onSectionSelect,
  isFeatured,
  isLast,
}: {
  row: DashboardMatrixRow;
  fillViewport: boolean;
  disabledSections: SectionKey[];
  onSectionSelect?: (rowId: string, section: SectionKey) => Promise<void> | void;
  isFeatured: boolean;
  isLast: boolean;
}) {
  const navigate = useNavigate();
  const serverActive = mapRowToSection(row);
  const [optimisticActive, setOptimisticActive] = useState<{
    serverActive: SectionKey;
    value: SectionKey;
  } | null>(null);
  const [pressing, setPressing] = useState<SectionKey | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const activeSection =
    optimisticActive?.serverActive === serverActive ? optimisticActive.value : serverActive;
  const theme = sectionThemes[activeSection];
  const weeklyDurationLabel = `今週 ${formatDurationHours(row.weeklyDurationSec)}`;

  const getFillPct = (key: SectionKey): number => {
    if (pressing && pressing !== activeSection) {
      if (key === pressing) return progress;
      if (key === activeSection) return 1 - progress;
      return 0;
    }
    return key === activeSection ? 1 : 0;
  };

  const handlePressStart = (section: SectionKey, startTime: number) => {
    if (disabledSections.includes(section)) return;
    if (section === activeSection) return;
    setPressing(section);
    setProgress(0);
    startTimeRef.current = startTime;
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - startTimeRef.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timerRef.current!);
        setOptimisticActive({ serverActive, value: section });
        setPressing(null);
        setProgress(0);
        void onSectionSelect?.(row.id, section);
      }
    }, 16);
  };

  const handlePressEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPressing(null);
    setProgress(0);
  };

  return (
    <article
      className={cn(
        "relative min-w-0 overflow-hidden rounded-[20px] border-2 shadow-soft transition-colors duration-700",
        fillViewport ? "flex h-full flex-col" : "",
        isFeatured && "col-span-2 row-span-2 ring-4 ring-amber-300/80",
        theme.cardBorder,
        theme.cardBg,
      )}
      style={fillViewport ? { containerType: "size" } : undefined}
    >
      <header
        className={cn(
          "grid min-h-0 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_minmax(0,1fr)] items-center border-b px-2 transition-colors duration-700",
          theme.headerBorder,
          theme.headerBg,
          fillViewport ? "h-[43cqh] gap-[1cqw]" : "gap-2 py-3",
        )}
      >
        <span
          className={cn(
            "min-w-0 font-mono font-bold tabular-nums transition-colors duration-700",
            theme.nameText,
            fillViewport ? "text-[clamp(11px,16cqh,38px)]" : "text-base",
          )}
          style={{ opacity: row.checkInAt !== "未出勤" ? 0.85 : 0 }}
        >
          {row.checkInAt !== "未出勤" ? row.checkInAt : ""}
        </span>
        <div className="min-w-0 text-center">
            <p
              className={cn(
                "truncate font-semibold leading-none transition-colors duration-700",
                theme.nameText,
                fillViewport ? "text-[clamp(15px,18cqh,46px)]" : "text-2xl",
              )}
              title={row.name}
            >
              {row.name}
            </p>
            <p
              className={cn(
                "mt-[2cqh] truncate font-mono font-bold leading-none tabular-nums transition-colors duration-700",
                theme.nameText,
                fillViewport ? "text-[clamp(9px,7cqh,20px)]" : "text-xs",
              )}
              style={{ opacity: 0.78 }}
              title={weeklyDurationLabel}
            >
              {weeklyDurationLabel}
            </p>
        </div>
        <span
          className={cn(
            "min-w-0 text-right font-mono font-bold tabular-nums transition-colors duration-700",
            theme.nameText,
            fillViewport ? "text-[clamp(11px,16cqh,38px)]" : "text-base",
          )}
          style={{ opacity: row.checkOutAt ? 0.85 : 0 }}
        >
          {row.checkOutAt ?? ""}
        </span>
      </header>

      <div className={cn("grid grid-cols-4 divide-x transition-colors duration-700", theme.sectionsDivide, theme.sectionsBg, fillViewport ? "flex-1 min-h-0" : "")} style={{ transitionDelay: "0ms" }}>
        {sections.map((section) => (
          <StatusSection
            key={section.key}
            fillPct={getFillPct(section.key)}
            noTransition={pressing !== null && (section.key === pressing || section.key === activeSection)}
            disabled={disabledSections.includes(section.key)}
            fillViewport={fillViewport}
            label={section.label}
            sectionKey={section.key}
            onPressStart={(startTime) => handlePressStart(section.key, startTime)}
            onPressEnd={handlePressEnd}
          />
        ))}
      </div>

      {isLast && (
        <button
          type="button"
          className="absolute bottom-2 right-2 z-20 rounded-full p-2 opacity-20 transition-opacity active:opacity-80"
          onClick={() => navigate("/demo/calibration")}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Crosshair
            className={cn("transition-colors duration-700", theme.nameText)}
            size={18}
            strokeWidth={1.5}
          />
        </button>
      )}

      {isFeatured && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-20 flex items-center gap-1 rounded-full border border-amber-300 bg-white/90 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-sm">
          <Trophy size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>Weekly #1</span>
        </div>
      )}
    </article>
  );
}

function formatDurationHours(durationSec: number): string {
  return `${(Math.max(0, durationSec) / 3600).toFixed(1)}h`;
}

function StatusSection({
  fillPct,
  noTransition,
  disabled,
  label,
  sectionKey,
  fillViewport,
  onPressStart,
  onPressEnd,
}: {
  fillPct: number;
  noTransition: boolean;
  disabled: boolean;
  label: string;
  sectionKey: SectionKey;
  fillViewport: boolean;
  onPressStart: (startTime: number) => void;
  onPressEnd: () => void;
}) {
  const Icon = sectionIcons[sectionKey];
  const theme = sectionThemes[sectionKey];
  const lit = fillPct > 0.5;

  return (
    <button
      type="button"
      className={cn(
        "relative flex h-full flex-col items-center justify-center gap-1.5 overflow-hidden px-2 text-center select-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-inset",
        disabled && "cursor-not-allowed opacity-40",
      )}
      style={
        fillViewport
          ? { paddingTop: "2cqh", paddingBottom: "2cqh" }
          : { minHeight: 84, paddingTop: 10, paddingBottom: 10 }
      }
      onPointerDown={(event) => onPressStart(event.timeStamp)}
      onPointerUp={onPressEnd}
      onPointerLeave={onPressEnd}
      onPointerCancel={onPressEnd}
    >
      {/* フィル背景（下から上） */}
      <div
        className={cn("absolute bottom-0 left-0 right-0", theme.fillBg)}
        style={{
          height: `${fillPct * 100}%`,
          transition: noTransition ? "none" : "height 600ms ease-out",
        }}
      />

      <Icon
        className={cn(
          "relative z-10 shrink-0 transition-colors duration-150",
          lit ? theme.textActive : theme.iconInactiveText,
          fillViewport ? "h-[clamp(14px,18cqh,58px)] w-[clamp(14px,18cqh,58px)]" : "h-5 w-5",
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 whitespace-nowrap font-semibold capitalize leading-none tracking-[0.01em] transition-colors duration-150",
          lit ? theme.textActive : theme.textInactive,
          fillViewport ? "text-[clamp(9px,9cqh,24px)]" : "text-[11px]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function mapRowToSection(row: DashboardMatrixRow): SectionKey {
  if (row.activeColumn === "home" || row.statusLabel === "Off Campus") {
    return "home";
  }

  if (row.activeColumn === "room") {
    return "lab";
  }

  if (row.activeColumn === "onCampus" || row.statusLabel === "On Campus") {
    return "onCampus";
  }

  return "class";
}

const sectionThemes: Record<
  SectionKey,
  {
    activeBg: string;
    cardBg: string;
    cardBorder: string;
    fillBg: string;
    headerBg: string;
    headerBorder: string;
    iconActiveBg: string;
    iconActiveBorder: string;
    iconActiveText: string;
    iconInactiveBg: string;
    iconInactiveBorder: string;
    iconInactiveText: string;
    inactiveBg: string;
    nameText: string;
    sectionsBg: string;
    sectionsDivide: string;
    textActive: string;
    textInactive: string;
  }
> = {
  lab: {
    activeBg: "bg-emerald-200",
    cardBg: "bg-emerald-100",
    cardBorder: "border-emerald-500",
    fillBg: "bg-emerald-100",
    headerBg: "bg-emerald-200",
    headerBorder: "border-emerald-300",
    iconActiveBg: "bg-emerald-600",
    iconActiveBorder: "border-emerald-400",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-emerald-200",
    iconInactiveBorder: "border-emerald-300",
    iconInactiveText: "text-black/30",
    inactiveBg: "bg-emerald-100",
    nameText: "text-emerald-950",
    sectionsBg: "bg-emerald-100",
    sectionsDivide: "divide-emerald-300",
    textActive: "text-emerald-950",
    textInactive: "text-black/30",
  },
  onCampus: {
    activeBg: "bg-amber-200",
    cardBg: "bg-amber-100",
    cardBorder: "border-amber-500",
    fillBg: "bg-amber-100",
    headerBg: "bg-amber-200",
    headerBorder: "border-amber-300",
    iconActiveBg: "bg-amber-600",
    iconActiveBorder: "border-amber-400",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-amber-200",
    iconInactiveBorder: "border-amber-300",
    iconInactiveText: "text-black/30",
    inactiveBg: "bg-amber-100",
    nameText: "text-amber-950",
    sectionsBg: "bg-amber-100",
    sectionsDivide: "divide-amber-300",
    textActive: "text-amber-950",
    textInactive: "text-black/30",
  },
  class: {
    activeBg: "bg-blue-200",
    cardBg: "bg-blue-100",
    cardBorder: "border-blue-500",
    fillBg: "bg-blue-100",
    headerBg: "bg-blue-200",
    headerBorder: "border-blue-300",
    iconActiveBg: "bg-blue-600",
    iconActiveBorder: "border-blue-400",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-blue-200",
    iconInactiveBorder: "border-blue-300",
    iconInactiveText: "text-black/30",
    inactiveBg: "bg-blue-100",
    nameText: "text-blue-950",
    sectionsBg: "bg-blue-100",
    sectionsDivide: "divide-blue-300",
    textActive: "text-blue-950",
    textInactive: "text-black/30",
  },
  home: {
    activeBg: "bg-slate-600",
    cardBg: "bg-slate-700",
    cardBorder: "border-slate-500",
    fillBg: "bg-slate-700",
    headerBg: "bg-slate-800",
    headerBorder: "border-slate-600",
    iconActiveBg: "bg-slate-300",
    iconActiveBorder: "border-slate-400",
    iconActiveText: "text-slate-900",
    iconInactiveBg: "bg-slate-600",
    iconInactiveBorder: "border-slate-500",
    iconInactiveText: "text-slate-400",
    inactiveBg: "bg-slate-700",
    nameText: "text-white",
    sectionsBg: "bg-slate-700",
    sectionsDivide: "divide-slate-600",
    textActive: "text-white",
    textInactive: "text-slate-400",
  },
};

import type { CSSProperties } from "react";

import type { DashboardMatrixRow } from "@/types/app";

import { Crosshair, FlaskConical, GraduationCap, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

type StatusCardGridProps = {
  rows: DashboardMatrixRow[];
  className?: string;
  fillViewport?: boolean;
  disabledSections?: SectionKey[];
  onSectionSelect?: (rowId: string, section: SectionKey) => Promise<void> | void;
};

type SectionKey = "lab" | "class" | "home";

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "lab", label: "Lab" },
  { key: "class", label: "class" },
  { key: "home", label: "Home" },
];

const sectionIcons: Record<SectionKey, typeof FlaskConical> = {
  lab: FlaskConical,
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
  const rowCount = Math.max(1, Math.ceil(rows.length / 2));

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
        <StatusCard key={row.id} fillViewport={fillViewport} rowCount={rowCount} disabledSections={disabledSections} onSectionSelect={onSectionSelect} row={row} isLast={index === rows.length - 1} />
      ))}
    </div>
  );
}

const HOLD_MS = 700;

function StatusCard({
  row,
  fillViewport,
  rowCount,
  disabledSections,
  onSectionSelect,
  isLast,
}: {
  row: DashboardMatrixRow;
  fillViewport: boolean;
  rowCount: number;
  disabledSections: SectionKey[];
  onSectionSelect?: (rowId: string, section: SectionKey) => Promise<void> | void;
  isLast: boolean;
}) {
  const navigate = useNavigate();
  const serverActive = mapRowToSection(row);
  const [localActive, setLocalActive] = useState<SectionKey | null>(null);
  const [pressing, setPressing] = useState<SectionKey | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // サーバー状態が変わったら楽観的表示をリセット
  useEffect(() => {
    setLocalActive(null);
  }, [serverActive]);

  const activeSection = localActive ?? serverActive;
  const nameStyle = buildNameStyle(row.name, fillViewport, rowCount);
  const theme = sectionThemes[activeSection];
  const iconSizes = computeIconSizes(rowCount, fillViewport);

  const getFillPct = (key: SectionKey): number => {
    if (pressing && pressing !== activeSection) {
      if (key === pressing) return progress;
      if (key === activeSection) return 1 - progress;
      return 0;
    }
    return key === activeSection ? 1 : 0;
  };

  const handlePressStart = (section: SectionKey) => {
    if (disabledSections.includes(section)) return;
    if (section === activeSection) return;
    setPressing(section);
    setProgress(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - startTimeRef.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timerRef.current!);
        setLocalActive(section);
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
        theme.cardBorder,
        theme.cardBg,
      )}
    >
      <header
        className={cn("border-b px-1 transition-colors duration-700", theme.headerBorder, theme.headerBg)}
        style={fillViewport ? { paddingTop: iconSizes.headerPad, paddingBottom: iconSizes.headerPad } : { paddingTop: 14, paddingBottom: 14 }}
      >
        <div className="relative flex items-center justify-center px-2">
          <span
            className={cn("absolute left-2 font-mono font-bold tabular-nums transition-colors duration-700", theme.nameText)}
            style={{ fontSize: Math.max(16, (nameStyle.fontSize as number) * 1.2), opacity: row.checkInAt !== "未出勤" ? 0.85 : 0 }}
          >
            {row.checkInAt !== "未出勤" ? row.checkInAt : ""}
          </span>
          <p
            className={cn("truncate text-center font-semibold tracking-[-0.01em] transition-colors duration-700", theme.nameText)}
            style={nameStyle}
            title={row.name}
          >
            {row.name}
          </p>
          <span
            className={cn("absolute right-2 font-mono font-bold tabular-nums transition-colors duration-700", theme.nameText)}
            style={{ fontSize: Math.max(16, (nameStyle.fontSize as number) * 1.2), opacity: row.checkOutAt ? 0.85 : 0 }}
          >
            {row.checkOutAt ?? ""}
          </span>
        </div>
      </header>

      <div className={cn("grid grid-cols-3 divide-x transition-colors duration-700", theme.sectionsDivide, theme.sectionsBg, fillViewport ? "flex-1 min-h-0" : "")} style={{ transitionDelay: "0ms" }}>
        {sections.map((section) => (
          <StatusSection
            key={section.key}
            fillPct={getFillPct(section.key)}
            noTransition={pressing !== null && (section.key === pressing || section.key === activeSection)}
            disabled={disabledSections.includes(section.key)}
            fillViewport={fillViewport}
            iconSizes={iconSizes}
            label={section.label}
            sectionKey={section.key}
            onPressStart={() => handlePressStart(section.key)}
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
    </article>
  );
}

type IconSizes = {
  circleSize: number;
  iconInCircle: number;
  iconBare: number;
  fontSize: number;
  sectionPad: number;
  headerPad: number;
};

function computeIconSizes(rowCount: number, fillViewport: boolean): IconSizes {
  if (!fillViewport) {
    return { circleSize: 32, iconInCircle: 16, iconBare: 20, fontSize: 11, sectionPad: 10, headerPad: 14 };
  }
  const scale = Math.max(0.65, Math.min(1.8, 6 / rowCount));
  return {
    circleSize: Math.round(80 * scale),
    iconInCircle: Math.round(42 * scale),
    iconBare: Math.round(58 * scale),
    fontSize: Math.max(16, Math.round(24 * scale)),
    sectionPad: Math.max(4, Math.round(10 * scale)),
    headerPad: Math.max(6, Math.round(12 * scale)),
  };
}

function buildNameStyle(name: string, fillViewport: boolean, rowCount = 6): CSSProperties {
  const length = name.length;
  const baseFontSize = Math.max(20, Math.min(46, 48 - Math.max(0, length - 10) * 0.9));
  const scale = fillViewport ? Math.max(0.65, Math.min(1.8, 6 / rowCount)) : 1;
  const fontSize = baseFontSize * (fillViewport ? scale : 1);

  return {
    fontSize: `${Math.max(18, fontSize)}px`,
    lineHeight: 1.12,
  };
}

function StatusSection({
  fillPct,
  noTransition,
  disabled,
  label,
  sectionKey,
  fillViewport,
  iconSizes,
  onPressStart,
  onPressEnd,
}: {
  fillPct: number;
  noTransition: boolean;
  disabled: boolean;
  label: string;
  sectionKey: SectionKey;
  fillViewport: boolean;
  iconSizes: IconSizes;
  onPressStart: () => void;
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
          ? { paddingTop: iconSizes.sectionPad, paddingBottom: iconSizes.sectionPad }
          : { minHeight: 84, paddingTop: 10, paddingBottom: 10 }
      }
      onPointerDown={onPressStart}
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
          "relative z-10 transition-colors duration-150",
          lit ? theme.textActive : theme.iconInactiveText,
        )}
        style={{ width: iconSizes.iconBare, height: iconSizes.iconBare }}
        strokeWidth={2}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 font-semibold capitalize tracking-[0.01em] transition-colors duration-150",
          lit ? theme.textActive : theme.textInactive,
        )}
        style={{ fontSize: iconSizes.fontSize, lineHeight: 1.1 }}
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

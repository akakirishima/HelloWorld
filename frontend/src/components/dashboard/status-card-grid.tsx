import type { CSSProperties } from "react";

import type { DashboardMatrixRow } from "@/types/app";

import { FlaskConical, GraduationCap, Home } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type StatusCardGridProps = {
  rows: DashboardMatrixRow[];
  className?: string;
  fillViewport?: boolean;
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
  onSectionSelect,
}: StatusCardGridProps) {
  const rowCount = Math.max(1, Math.ceil(rows.length / 2));

  return (
    <div
      className={cn(
        "grid grid-cols-2",
        fillViewport ? "h-full min-h-0 w-full gap-3" : "gap-4",
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
      {rows.map((row) => (
        <StatusCard key={row.id} fillViewport={fillViewport} rowCount={rowCount} onSectionSelect={onSectionSelect} row={row} />
      ))}
    </div>
  );
}

const HOLD_MS = 700;

function StatusCard({
  row,
  fillViewport,
  rowCount,
  onSectionSelect,
}: {
  row: DashboardMatrixRow;
  fillViewport: boolean;
  rowCount: number;
  onSectionSelect?: (rowId: string, section: SectionKey) => Promise<void> | void;
}) {
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
        "min-w-0 overflow-hidden rounded-[28px] border shadow-soft",
        fillViewport ? "flex h-full flex-col" : "",
        theme.cardBorder,
        theme.cardBg,
      )}
    >
      <header
        className={cn("border-b px-4 text-center sm:px-5", theme.headerBorder, theme.headerBg)}
        style={fillViewport ? { paddingTop: iconSizes.headerPad, paddingBottom: iconSizes.headerPad } : { paddingTop: 14, paddingBottom: 14 }}
      >
        <p
          className={cn("w-full truncate font-semibold tracking-[-0.01em]", theme.nameText)}
          style={nameStyle}
          title={row.name}
        >
          {row.name}
        </p>
      </header>

      <div className={cn("grid grid-cols-3 divide-x", theme.sectionsDivide, theme.sectionsBg, fillViewport ? "flex-1 min-h-0" : "")}>
        {sections.map((section) => (
          <StatusSection
            key={section.key}
            fillPct={getFillPct(section.key)}
            isPressing={pressing === section.key}
            fillViewport={fillViewport}
            iconSizes={iconSizes}
            label={section.label}
            sectionKey={section.key}
            onPressStart={() => handlePressStart(section.key)}
            onPressEnd={handlePressEnd}
          />
        ))}
      </div>
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
  const scale = Math.max(0.55, Math.min(1.5, 6 / rowCount));
  return {
    circleSize: Math.round(56 * scale),
    iconInCircle: Math.round(28 * scale),
    iconBare: Math.round(36 * scale),
    fontSize: Math.max(11, Math.round(15 * scale)),
    sectionPad: Math.max(4, Math.round(8 * scale)),
    headerPad: Math.max(6, Math.round(10 * scale)),
  };
}

function buildNameStyle(name: string, fillViewport: boolean, rowCount = 6): CSSProperties {
  const length = name.length;
  const baseFontSize = Math.max(12, Math.min(20, 22 - Math.max(0, length - 10) * 0.6));
  const scale = fillViewport ? Math.max(0.55, Math.min(1.5, 6 / rowCount)) : 1;
  const fontSize = baseFontSize * (fillViewport ? scale * 0.9 : 1);

  return {
    fontSize: `${Math.max(10, fontSize)}px`,
    lineHeight: 1.12,
  };
}

function StatusSection({
  fillPct,
  isPressing,
  label,
  sectionKey,
  fillViewport,
  iconSizes,
  onPressStart,
  onPressEnd,
}: {
  fillPct: number;
  isPressing: boolean;
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
          transition: isPressing ? "none" : "height 250ms ease-out",
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
    activeBg: "bg-emerald-100",
    cardBg: "bg-emerald-50",
    cardBorder: "border-emerald-200",
    fillBg: "bg-emerald-200",
    headerBg: "bg-emerald-100",
    headerBorder: "border-emerald-200",
    iconActiveBg: "bg-emerald-500",
    iconActiveBorder: "border-emerald-300",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-emerald-100",
    iconInactiveBorder: "border-emerald-200",
    iconInactiveText: "text-black/30",
    inactiveBg: "bg-emerald-50",
    nameText: "text-emerald-950",
    sectionsBg: "bg-emerald-50",
    sectionsDivide: "divide-emerald-200",
    textActive: "text-emerald-950",
    textInactive: "text-black/30",
  },
  class: {
    activeBg: "bg-sky-100",
    cardBg: "bg-sky-50",
    cardBorder: "border-sky-200",
    fillBg: "bg-sky-200",
    headerBg: "bg-sky-100",
    headerBorder: "border-sky-200",
    iconActiveBg: "bg-sky-500",
    iconActiveBorder: "border-sky-300",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-sky-100",
    iconInactiveBorder: "border-sky-200",
    iconInactiveText: "text-black/30",
    inactiveBg: "bg-sky-50",
    nameText: "text-sky-950",
    sectionsBg: "bg-sky-50",
    sectionsDivide: "divide-sky-200",
    textActive: "text-sky-950",
    textInactive: "text-black/30",
  },
  home: {
    activeBg: "bg-slate-200",
    cardBg: "bg-slate-100",
    cardBorder: "border-slate-300",
    fillBg: "bg-slate-300",
    headerBg: "bg-slate-200",
    headerBorder: "border-slate-300",
    iconActiveBg: "bg-slate-500",
    iconActiveBorder: "border-slate-400",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-slate-200",
    iconInactiveBorder: "border-slate-300",
    iconInactiveText: "text-black/30",
    inactiveBg: "bg-slate-100",
    nameText: "text-slate-900",
    sectionsBg: "bg-slate-100",
    sectionsDivide: "divide-slate-300",
    textActive: "text-slate-900",
    textInactive: "text-black/30",
  },
};

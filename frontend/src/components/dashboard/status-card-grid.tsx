import type { DashboardMatrixRow } from "@/types/app";

import { FlaskConical, GraduationCap, Home, School } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const OPTIMISTIC_TTL_MS = 5000;

type StatusCardGridProps = {
  rows: DashboardMatrixRow[];
  className?: string;
  fillViewport?: boolean;
  showAds?: boolean;
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
  showAds = false,
  disabledSections = [],
  onSectionSelect,
}: StatusCardGridProps) {
  const memberRowCount = Math.max(1, Math.ceil(rows.length / 2));
  const rowCount = memberRowCount + (showAds ? 1 : 0);

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
      {rows.map((row) => (
        <StatusCard
          key={row.id}
          fillViewport={fillViewport}
          disabledSections={disabledSections}
          onSectionSelect={onSectionSelect}
          row={row}
        />
      ))}
      {showAds ? <BoardAdCarousel /> : null}
    </div>
  );
}

const boardAds = [
  {
    id: "research-overview",
    src: "/ads/research-overview.webp",
    alt: "AIで世界の動きを読み解く研究紹介",
  },
  {
    id: "infant-motion",
    src: "/ads/infant-motion.webp",
    alt: "新生児の運動解析研究紹介",
  },
  {
    id: "baseball-motion",
    src: "/ads/baseball-motion.webp",
    alt: "野球の投球動作解析研究紹介",
  },
  {
    id: "cattle-motion",
    src: "/ads/cattle-motion.webp",
    alt: "牛の行動解析研究紹介",
  },
] as const;

const AD_DISPLAY_MS = 15000;

function BoardAdCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % boardAds.length);
    }, AD_DISPLAY_MS);
    return () => window.clearInterval(timer);
  }, []);

  const activeAd = boardAds[currentIndex];

  return (
    <aside
      aria-label="広告枠"
      className="relative col-span-2 col-start-1 min-h-0 overflow-hidden"
      data-active-ad={activeAd.id}
      data-testid="board-ad-carousel"
    >
      <img
        key={activeAd.id}
        alt={activeAd.alt}
        className="h-full w-full object-contain"
        draggable={false}
        src={activeAd.src}
        loading="lazy"
        decoding="async"
      />
    </aside>
  );
}

const HOLD_MS = 700;

function StatusCard({
  row,
  fillViewport,
  disabledSections,
  onSectionSelect,
}: {
  row: DashboardMatrixRow;
  fillViewport: boolean;
  disabledSections: SectionKey[];
  onSectionSelect?: (rowId: string, section: SectionKey) => Promise<void> | void;
}) {
  const serverActive = mapRowToSection(row);
  const [optimisticActive, setOptimisticActive] = useState<SectionKey | null>(null);
  const [pressing, setPressing] = useState<SectionKey | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const activeSection = optimisticActive ?? serverActive;
  const theme = sectionThemes[activeSection];

  /* 最新のユーザー意図を TTL の間だけ守る。
     サーバが opt.value に追いつけば表示は同じなのでそのまま同居し、TTL 後に自然消失。
     サーバが別値でも TTL 内はユーザー意図優先（連続押しの先着 refresh に破壊されない）。 */
  useEffect(() => {
    if (optimisticActive === null) return;
    const timeout = window.setTimeout(() => setOptimisticActive(null), OPTIMISTIC_TTL_MS);
    return () => window.clearTimeout(timeout);
  }, [optimisticActive]);

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
    if (timerRef.current) clearInterval(timerRef.current); // 前のタイマー残骸を防御的に破棄
    setPressing(section);
    setProgress(0);
    startTimeRef.current = startTime;
    timerRef.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - startTimeRef.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setOptimisticActive(section);
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

  const rankGlow =
    row.weeklyRank === 1
      ? "rank-glow-gold"
      : row.weeklyRank === 2
      ? "rank-glow-silver"
      : row.weeklyRank === 3
      ? "rank-glow-bronze"
      : "";

  return (
    <article
      className={cn(
        "relative min-w-0 overflow-hidden rounded-[20px] border-2 transition-colors duration-200",
        fillViewport ? "flex h-full flex-col" : "",
        rankGlow,
        theme.cardBorder,
        theme.cardBg,
      )}
      style={fillViewport ? { containerType: "size" } : undefined}
    >
      {/* ── 上部エリア ── */}
      <header
        className={cn(
          "flex shrink-0 flex-col border-b px-3 transition-colors duration-200",
          theme.headerBorder,
          theme.headerBg,
          fillViewport ? "h-[55cqh] py-[2cqh]" : "py-3",
        )}
      >
        {/* 行1: 時刻(左) + 名前(中央) + 時刻(右) — 左右スロット幅は固定して名前を常に真ん中に */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-baseline gap-1">
          <span
            className={cn(
              "min-w-0 truncate text-left font-mono font-bold tabular-nums transition-colors duration-200",
              theme.nameText,
              fillViewport ? "text-[clamp(13px,9cqh,22px)]" : "text-base",
            )}
            style={{ opacity: row.checkInAt !== "未出勤" ? 0.9 : 0 }}
          >
            {row.checkInAt !== "未出勤" ? row.checkInAt : ""}
          </span>
          <p
            className={cn(
              "min-w-0 truncate text-center font-semibold leading-tight transition-colors duration-200",
              theme.nameText,
              fillViewport ? "text-[clamp(12px,12cqh,36px)]" : "text-xl sm:text-2xl",
            )}
            title={row.name}
          >
            {row.name}
          </p>
          <span
            className={cn(
              "min-w-0 truncate text-right font-mono font-bold tabular-nums transition-colors duration-200",
              theme.nameText,
              fillViewport ? "text-[clamp(13px,9cqh,22px)]" : "text-base",
            )}
            style={{ opacity: row.checkOutAt ? 0.9 : 0 }}
          >
            {row.checkOutAt ?? ""}
          </span>
        </div>

        {/* 行2: 曜日別滞在時間グリッド */}
        <DailyDurationsGrid
          dailyDurationsSec={row.dailyDurationsSec}
          fillViewport={fillViewport}
          nameTextClass={theme.nameText}
        />
      </header>

      <div className={cn("grid grid-cols-4 divide-x transition-colors duration-200", theme.sectionsDivide, theme.sectionsBg, fillViewport ? "flex-1 min-h-0" : "")} style={{ transitionDelay: "0ms" }}>
        {sections.map((section) => (
          <StatusSection
            key={section.key}
            fillPct={getFillPct(section.key)}
            noTransition={pressing !== null && (section.key === pressing || section.key === activeSection)}
            disabled={disabledSections.includes(section.key)}
            fillViewport={fillViewport}
            label={section.label}
            sectionKey={section.key}
            cardInactiveIconClass={theme.iconInactiveText}
            cardInactiveTextClass={theme.textInactive}
            onPressStart={(startTime) => handlePressStart(section.key, startTime)}
            onPressEnd={handlePressEnd}
          />
        ))}
      </div>

    </article>
  );
}

/** 秒を「4h」「4.5h」形式に変換。整数なら小数なし。 */
function formatDailyHours(sec: number): string {
  const hours = Math.max(0, sec) / 3600;
  return Number.isInteger(hours) ? `${hours}h` : `${parseFloat(hours.toFixed(1))}h`;
}

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const THRESHOLD_HOURS_SEC = 7 * 3600;

/** JST 基準で「今日」の曜日 index(月=0..日=6) を返す */
function getJstTodayIndex(): number {
  const jstDay = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  return map[jstDay] ?? 0;
}

function DailyDurationsGrid({
  dailyDurationsSec,
  fillViewport,
  nameTextClass,
}: {
  dailyDurationsSec?: number[];
  fillViewport: boolean;
  nameTextClass: string;
}) {
  const durations = dailyDurationsSec ?? [0, 0, 0, 0, 0, 0, 0];
  const todayIndex = getJstTodayIndex();

  return (
    <div
      className={cn(
        "mt-auto grid grid-cols-7",
        fillViewport
          ? "text-[clamp(9px,8cqh,18px)]"
          : "mt-2 text-xs sm:text-sm",
      )}
    >
      {DAY_LABELS.map((label, index) => {
        const sec = durations[index] ?? 0;
        const isFuture = index > todayIndex;
        const isAboveThreshold = sec >= THRESHOLD_HOURS_SEC;
        const durationColor = isAboveThreshold ? "text-blue-500" : "text-red-500";
        const labelColor = isFuture ? nameTextClass : durationColor;
        return (
          <div
            key={label}
            className="flex min-w-0 flex-col items-center gap-0.5 py-1"
          >
            <span className={cn("truncate font-black", labelColor, isFuture && "opacity-80")}>
              {label}
            </span>
            <span
              className={cn(
                "truncate font-bold tabular-nums",
                durationColor,
                fillViewport ? "text-[clamp(13px,12cqh,26px)]" : "text-base sm:text-lg",
              )}
              style={{ visibility: isFuture ? "hidden" : "visible" }}
            >
              {formatDailyHours(sec)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatusSection({
  fillPct,
  noTransition,
  disabled,
  label,
  sectionKey,
  fillViewport,
  cardInactiveIconClass,
  cardInactiveTextClass,
  onPressStart,
  onPressEnd,
}: {
  fillPct: number;
  noTransition: boolean;
  disabled: boolean;
  label: string;
  sectionKey: SectionKey;
  fillViewport: boolean;
  cardInactiveIconClass: string;
  cardInactiveTextClass: string;
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
          lit ? theme.textActive : cardInactiveIconClass,
          fillViewport ? "h-[clamp(14px,14cqh,44px)] w-[clamp(14px,14cqh,44px)]" : "h-6 w-6",
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 whitespace-nowrap font-semibold capitalize leading-none tracking-[0.01em] transition-colors duration-150",
          lit ? theme.textActive : cardInactiveTextClass,
          fillViewport ? "text-[clamp(10px,7cqh,22px)]" : "text-[13px]",
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
    fillBg: "bg-emerald-400",
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
    fillBg: "bg-amber-400",
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
    fillBg: "bg-blue-400",
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
    fillBg: "bg-slate-400",
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

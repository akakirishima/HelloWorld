import type { CSSProperties } from "react";

import type { DashboardMatrixRow } from "@/types/app";

import { FlaskConical, GraduationCap, Home } from "lucide-react";

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
        <StatusCard key={row.id} fillViewport={fillViewport} onSectionSelect={onSectionSelect} row={row} />
      ))}
    </div>
  );
}

function StatusCard({
  row,
  fillViewport,
  onSectionSelect,
}: {
  row: DashboardMatrixRow;
  fillViewport: boolean;
  onSectionSelect?: (rowId: string, section: SectionKey) => Promise<void> | void;
}) {
  const activeSection = mapRowToSection(row);
  const nameStyle = buildNameStyle(row.name, fillViewport);
  const theme = sectionThemes[activeSection];

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
        className={cn("border-b px-4 text-center sm:px-5", theme.headerBorder)}
        style={fillViewport ? { paddingTop: 10, paddingBottom: 10 } : { paddingTop: 14, paddingBottom: 14 }}
      >
        <p
          className={cn("w-full truncate font-semibold tracking-[-0.01em]", theme.nameText)}
          style={nameStyle}
          title={row.name}
        >
          {row.name}
        </p>
      </header>

      <div className={cn("grid grid-cols-3 divide-x divide-slate-200 bg-slate-50/80", fillViewport ? "flex-1 min-h-0" : "")}>
        {sections.map((section) => (
          <StatusSection
            key={section.key}
            active={section.key === activeSection}
            fillViewport={fillViewport}
            label={section.label}
            sectionKey={section.key}
            onClick={() => {
              void onSectionSelect?.(row.id, section.key);
            }}
          />
        ))}
      </div>
    </article>
  );
}

function buildNameStyle(name: string, fillViewport: boolean): CSSProperties {
  const length = name.length;
  const baseFontSize = Math.max(12, Math.min(20, 22 - Math.max(0, length - 10) * 0.6));
  const fontSize = fillViewport ? baseFontSize * 0.9 : baseFontSize;

  return {
    fontSize: `${fontSize}px`,
    lineHeight: 1.12,
  };
}

function StatusSection({
  active,
  label,
  sectionKey,
  fillViewport,
  onClick,
}: {
  active: boolean;
  label: string;
  sectionKey: SectionKey;
  fillViewport: boolean;
  onClick: () => void;
}) {
  const Icon = sectionIcons[sectionKey];
  const theme = sectionThemes[sectionKey];

  return (
    <button
      type="button"
      className={cn(
        "flex h-full flex-col items-center justify-center gap-1.5 px-2 text-center transition-colors",
        active ? theme.activeBg : theme.inactiveBg,
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-inset",
      )}
      style={
        fillViewport
          ? { paddingTop: 8, paddingBottom: 8 }
          : { minHeight: 84, paddingTop: 10, paddingBottom: 10 }
      }
      onClick={onClick}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border",
          active ? theme.iconActiveBorder : theme.iconInactiveBorder,
          active ? theme.iconActiveBg : theme.iconInactiveBg,
        )}
        style={fillViewport ? { width: 28, height: 28 } : { width: 32, height: 32 }}
        aria-hidden="true"
      >
        <Icon
          className={cn(active ? theme.iconActiveText : theme.iconInactiveText)}
          style={fillViewport ? { width: 14, height: 14 } : { width: 16, height: 16 }}
          strokeWidth={2.25}
        />
      </span>
      <span
        className={cn("font-semibold capitalize tracking-[0.01em]", active ? theme.textActive : theme.textInactive)}
        style={{ fontSize: fillViewport ? 10 : 11, lineHeight: 1.1 }}
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
    headerBorder: string;
    iconActiveBg: string;
    iconActiveBorder: string;
    iconActiveText: string;
    iconInactiveBg: string;
    iconInactiveBorder: string;
    iconInactiveText: string;
    inactiveBg: string;
    nameText: string;
    textActive: string;
    textInactive: string;
  }
> = {
  lab: {
    activeBg: "bg-emerald-50",
    cardBg: "bg-white",
    cardBorder: "border-emerald-200",
    headerBorder: "border-emerald-100",
    iconActiveBg: "bg-emerald-500",
    iconActiveBorder: "border-emerald-300",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-emerald-100",
    iconInactiveBorder: "border-emerald-200",
    iconInactiveText: "text-emerald-600",
    inactiveBg: "bg-white",
    nameText: "text-emerald-950",
    textActive: "text-emerald-950",
    textInactive: "text-emerald-700",
  },
  class: {
    activeBg: "bg-sky-50",
    cardBg: "bg-white",
    cardBorder: "border-sky-200",
    headerBorder: "border-sky-100",
    iconActiveBg: "bg-sky-500",
    iconActiveBorder: "border-sky-300",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-sky-100",
    iconInactiveBorder: "border-sky-200",
    iconInactiveText: "text-sky-600",
    inactiveBg: "bg-white",
    nameText: "text-sky-950",
    textActive: "text-sky-950",
    textInactive: "text-sky-700",
  },
  home: {
    activeBg: "bg-slate-100",
    cardBg: "bg-slate-50",
    cardBorder: "border-slate-200",
    headerBorder: "border-slate-200",
    iconActiveBg: "bg-slate-500",
    iconActiveBorder: "border-slate-300",
    iconActiveText: "text-white",
    iconInactiveBg: "bg-slate-100",
    iconInactiveBorder: "border-slate-200",
    iconInactiveText: "text-slate-600",
    inactiveBg: "bg-slate-50",
    nameText: "text-slate-900",
    textActive: "text-slate-900",
    textInactive: "text-slate-700",
  },
};
